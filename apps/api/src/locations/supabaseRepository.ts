import type { SupabaseClient } from "@supabase/supabase-js";
import type { MushroomSnapshot, SocialLinks, VenueEnrichmentCache, VenueListItem } from "@blockwise/types";
import type {
  CategoryRecord,
  CreateLocationInput,
  LocationDetailRecord,
  LocationRecord,
  LocationRepository,
  SetLocationKindInput,
  UpdateLocationInput,
} from "./repository";

// "who's foraged here" mosaic (MushroomField's distinctMushrooms mode) --
// PostgREST has no DISTINCT ON, so dedupe by user in application code: scan
// the QUERY_LIMIT most recent check-ins (generous enough that a venue with
// heavy repeat-visit traffic still surfaces DISTINCT_LIMIT distinct users),
// keep the first (most recent) row per user, then cap at DISTINCT_LIMIT.
const RECENT_CHECKIN_SNAPSHOT_QUERY_LIMIT = 60;
const RECENT_CHECKIN_SNAPSHOT_DISTINCT_LIMIT = 12;

interface CategoryEmbed {
  name: string;
  parent?: CategoryEmbed[] | CategoryEmbed | null;
}

// Without generated Database types passed to createClient (see supabase.ts),
// supabase-js can't tell category_id(name) is a many-to-one embed, so it
// falls back to array cardinality -- normalize to a single row here.
function categoryName(embed: CategoryEmbed[] | CategoryEmbed | null): string | null {
  const category = Array.isArray(embed) ? embed[0] : embed;
  return category?.name ?? null;
}

// The category is always a leaf (e.g. "Coffee Shop"); its group (e.g. "Food
// & Drink", README §2) is the leaf's parent row. Falls back to the
// category's own name for the rare case it has no parent.
function categoryGroupName(embed: CategoryEmbed[] | CategoryEmbed | null): string | null {
  const category = Array.isArray(embed) ? embed[0] : embed;
  if (!category) return null;
  return categoryName(category.parent ?? null) ?? category.name;
}

const LOCATION_COLUMNS =
  "id, neighborhood_id, google_place_id, name, kind, category_id, description, lat, lng, address, claimed_by_business, status, created_at, category:category_id(name, parent:parent_category_id(name))";

interface LocationRow {
  id: string;
  neighborhood_id: string;
  google_place_id: string | null;
  name: string;
  kind: "business" | "poi";
  category_id: string | null;
  category: CategoryEmbed[] | CategoryEmbed | null;
  description: string | null;
  lat: number | null;
  lng: number | null;
  address: string | null;
  claimed_by_business: boolean;
  status: LocationRecord["status"];
  created_at: string;
}

function toRecord(row: LocationRow): LocationRecord {
  return {
    id: row.id,
    neighborhoodId: row.neighborhood_id,
    googlePlaceId: row.google_place_id,
    name: row.name,
    kind: row.kind,
    categoryId: row.category_id,
    categoryName: categoryName(row.category),
    categoryGroup: categoryGroupName(row.category),
    description: row.description,
    lat: row.lat,
    lng: row.lng,
    address: row.address,
    claimedByBusiness: row.claimed_by_business,
    status: row.status,
    createdAt: row.created_at,
  };
}

export class SupabaseLocationRepository implements LocationRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async listVenues(neighborhoodId: string): Promise<VenueListItem[]> {
    const { data, error } = await this.supabase
      .from("venue")
      .select(
        "id, name, address, lat, lng, category:category_id(name, parent:parent_category_id(name))"
      )
      .eq("neighborhood_id", neighborhoodId)
      .eq("kind", "business")
      .eq("status", "active")
      .order("name");

    if (error) throw new Error(`listVenues failed: ${error.message}`);

    return (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      address: row.address,
      lat: row.lat,
      lng: row.lng,
      category_name: categoryName(row.category),
      category_group: categoryGroupName(row.category),
    }));
  }

  async listLocationsForNeighborhood(neighborhoodId: string, search?: string): Promise<LocationRecord[]> {
    let query = this.supabase
      .from("venue")
      .select(LOCATION_COLUMNS)
      .eq("neighborhood_id", neighborhoodId)
      .neq("status", "removed")
      .order("name");
    if (search) query = query.or(`name.ilike.%${search}%,address.ilike.%${search}%`);

    const { data, error } = await query;
    if (error) throw new Error(`listLocationsForNeighborhood failed: ${error.message}`);
    return (data ?? []).map((row) => toRecord(row as unknown as LocationRow));
  }

  async countActiveLocationsForNeighborhood(neighborhoodId: string, kind: "business" | "poi"): Promise<number> {
    const { count, error } = await this.supabase
      .from("venue")
      .select("id", { count: "exact", head: true })
      .eq("neighborhood_id", neighborhoodId)
      .eq("kind", kind)
      .eq("status", "active");

    if (error) throw new Error(`countActiveLocationsForNeighborhood failed: ${error.message}`);
    return count ?? 0;
  }

  async getLocationById(locationId: string): Promise<LocationRecord | null> {
    const { data, error } = await this.supabase
      .from("venue")
      .select(LOCATION_COLUMNS)
      .eq("id", locationId)
      .maybeSingle();

    if (error) throw new Error(`getLocationById failed: ${error.message}`);
    return data ? toRecord(data as unknown as LocationRow) : null;
  }

  async getLocationDetail(locationId: string): Promise<LocationDetailRecord | null> {
    const { data: location, error: locationError } = await this.supabase
      .from("venue")
      .select(
        "id, google_place_id, name, kind, description, address, lat, lng, claimed_by_business, category:category_id(name), neighborhood:neighborhood_id(slug, name)"
      )
      .eq("id", locationId)
      .eq("status", "active")
      .maybeSingle();

    if (locationError) throw new Error(`getLocationDetail failed: ${locationError.message}`);
    if (!location) return null;

    const neighborhoodEmbed = Array.isArray(location.neighborhood)
      ? location.neighborhood[0]
      : location.neighborhood;

    const [
      { data: enrichment, error: enrichmentError },
      { data: claim, error: claimError },
      { count: checkinCount, error: checkinError },
      { count: favoriteCount, error: favoriteError },
      { data: recentCheckins, error: recentCheckinsError },
    ] = await Promise.all([
      this.supabase
        .from("venue_enrichment_cache")
        .select(
          "venue_id, source, rating, reviews, price_tier, photo_refs, phone, website, hours, editorial_summary, atmosphere, fetched_at"
        )
        .eq("venue_id", locationId)
        .eq("source", "google")
        .maybeSingle(),
      this.supabase
        .from("business_claim")
        .select("social_links")
        .eq("venue_id", locationId)
        .eq("status", "approved")
        .maybeSingle(),
      this.supabase
        .from("checkin")
        .select("id", { count: "exact", head: true })
        .eq("venue_id", locationId),
      this.supabase
        .from("favorite")
        .select("id", { count: "exact", head: true })
        .eq("venue_id", locationId),
      this.supabase
        .from("checkin")
        .select("user_id, mushroom_snapshot")
        .eq("venue_id", locationId)
        .not("mushroom_snapshot", "is", null)
        .order("checked_in_at", { ascending: false })
        .limit(RECENT_CHECKIN_SNAPSHOT_QUERY_LIMIT),
    ]);

    if (enrichmentError)
      throw new Error(`getLocationDetail (enrichment) failed: ${enrichmentError.message}`);
    if (claimError) throw new Error(`getLocationDetail (claim) failed: ${claimError.message}`);
    if (checkinError) throw new Error(`getLocationDetail (checkin count) failed: ${checkinError.message}`);
    if (favoriteError) throw new Error(`getLocationDetail (favorite count) failed: ${favoriteError.message}`);
    if (recentCheckinsError)
      throw new Error(`getLocationDetail (recent checkin snapshots) failed: ${recentCheckinsError.message}`);

    const seenUsers = new Set<string>();
    const recentCheckinMushrooms: MushroomSnapshot[] = [];
    for (const row of recentCheckins ?? []) {
      if (recentCheckinMushrooms.length >= RECENT_CHECKIN_SNAPSHOT_DISTINCT_LIMIT) break;
      if (seenUsers.has(row.user_id)) continue;
      seenUsers.add(row.user_id);
      recentCheckinMushrooms.push(row.mushroom_snapshot as MushroomSnapshot);
    }

    return {
      id: location.id,
      googlePlaceId: location.google_place_id,
      name: location.name,
      kind: location.kind,
      description: location.description,
      address: location.address,
      lat: location.lat,
      lng: location.lng,
      categoryName: categoryName(location.category),
      claimedByBusiness: location.claimed_by_business,
      enrichment: (enrichment as VenueEnrichmentCache | null) ?? null,
      neighborhoodSlug: neighborhoodEmbed.slug,
      neighborhoodName: neighborhoodEmbed.name,
      socialLinks: (claim?.social_links as SocialLinks | null) ?? {},
      checkinCount: checkinCount ?? 0,
      favoriteCount: favoriteCount ?? 0,
      recentCheckinMushrooms,
    };
  }

  async getLocationNeighborhoodId(locationId: string): Promise<string | null> {
    const { data, error } = await this.supabase
      .from("venue")
      .select("neighborhood_id")
      .eq("id", locationId)
      .maybeSingle();

    if (error) throw new Error(`getLocationNeighborhoodId failed: ${error.message}`);
    return data?.neighborhood_id ?? null;
  }

  async createLocation(input: CreateLocationInput): Promise<LocationRecord> {
    const { data, error } = await this.supabase
      .from("venue")
      .insert({
        neighborhood_id: input.neighborhoodId,
        kind: input.kind,
        name: input.name,
        description: input.description,
        category_id: input.categoryId,
        lat: input.lat,
        lng: input.lng,
        google_place_id: input.googlePlaceId,
        address: input.address,
        ...(input.status ? { status: input.status } : {}),
      })
      .select(LOCATION_COLUMNS)
      .single();

    if (error) throw new Error(`createLocation failed: ${error.message}`);
    return toRecord(data as unknown as LocationRow);
  }

  async updateLocation(locationId: string, input: UpdateLocationInput): Promise<LocationRecord> {
    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.description !== undefined) patch.description = input.description;
    if (input.lat !== undefined) patch.lat = input.lat;
    if (input.lng !== undefined) patch.lng = input.lng;
    if (input.address !== undefined) patch.address = input.address;

    const { data, error } = await this.supabase
      .from("venue")
      .update(patch)
      .eq("id", locationId)
      .select(LOCATION_COLUMNS)
      .single();

    if (error) throw new Error(`updateLocation failed: ${error.message}`);
    return toRecord(data as unknown as LocationRow);
  }

  async setLocationStatus(locationId: string, status: LocationRecord["status"]): Promise<LocationRecord> {
    const { data, error } = await this.supabase
      .from("venue")
      .update({ status })
      .eq("id", locationId)
      .select(LOCATION_COLUMNS)
      .single();

    if (error) throw new Error(`setLocationStatus failed: ${error.message}`);
    return toRecord(data as unknown as LocationRow);
  }

  async setLocationKind(locationId: string, input: SetLocationKindInput): Promise<LocationRecord> {
    const patch: Record<string, unknown> = { kind: input.kind };
    if (input.kind === "business") {
      if (input.categoryId !== undefined) patch.category_id = input.categoryId;
    } else {
      patch.category_id = null;
      patch.claimed_by_business = false;
    }

    const { data, error } = await this.supabase
      .from("venue")
      .update(patch)
      .eq("id", locationId)
      .select(LOCATION_COLUMNS)
      .single();

    if (error) throw new Error(`setLocationKind failed: ${error.message}`);
    return toRecord(data as unknown as LocationRow);
  }

  async updateLocationCategory(locationId: string, categoryId: string): Promise<LocationRecord> {
    const { data, error } = await this.supabase
      .from("venue")
      .update({ category_id: categoryId })
      .eq("id", locationId)
      .select(LOCATION_COLUMNS)
      .single();

    if (error) throw new Error(`updateLocationCategory failed: ${error.message}`);
    return toRecord(data as unknown as LocationRow);
  }

  async listCategories(): Promise<CategoryRecord[]> {
    const { data, error } = await this.supabase
      .from("category")
      .select("id, name, parent:parent_category_id(name)")
      .not("parent_category_id", "is", null)
      .eq("status", "active")
      .order("name");

    if (error) throw new Error(`listCategories failed: ${error.message}`);
    return (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      groupName: categoryName(row.parent as CategoryEmbed[] | CategoryEmbed | null),
    }));
  }

  async getLeafCategory(categoryId: string): Promise<{ id: string } | null> {
    const { data, error } = await this.supabase
      .from("category")
      .select("id")
      .eq("id", categoryId)
      .not("parent_category_id", "is", null)
      .eq("status", "active")
      .maybeSingle();

    if (error) throw new Error(`getLeafCategory failed: ${error.message}`);
    return data;
  }

  async hasDependentActivity(locationId: string): Promise<boolean> {
    const [checkin, pointEvent, challenge, favorite, claim, coupon, event] = await Promise.all([
      this.supabase.from("checkin").select("id").eq("venue_id", locationId).limit(1),
      this.supabase.from("point_event").select("id").eq("venue_id", locationId).limit(1),
      this.supabase.from("challenge").select("id").eq("venue_id", locationId).limit(1),
      this.supabase.from("favorite").select("id").eq("venue_id", locationId).limit(1),
      this.supabase.from("business_claim").select("id").eq("venue_id", locationId).limit(1),
      this.supabase.from("coupon").select("id").eq("venue_id", locationId).limit(1),
      this.supabase.from("event").select("id").eq("venue_id", locationId).limit(1),
    ]);
    for (const [name, result] of [
      ["checkin", checkin],
      ["point_event", pointEvent],
      ["challenge", challenge],
      ["favorite", favorite],
      ["business_claim", claim],
      ["coupon", coupon],
      ["event", event],
    ] as const) {
      if (result.error) throw new Error(`hasDependentActivity (${name}) failed: ${result.error.message}`);
    }

    return (
      (checkin.data?.length ?? 0) > 0 ||
      (pointEvent.data?.length ?? 0) > 0 ||
      (challenge.data?.length ?? 0) > 0 ||
      (favorite.data?.length ?? 0) > 0 ||
      (claim.data?.length ?? 0) > 0 ||
      (coupon.data?.length ?? 0) > 0 ||
      (event.data?.length ?? 0) > 0
    );
  }

  async deleteLocation(locationId: string): Promise<void> {
    const { error } = await this.supabase.from("venue").delete().eq("id", locationId);
    if (error) throw new Error(`deleteLocation failed: ${error.message}`);
  }
}
