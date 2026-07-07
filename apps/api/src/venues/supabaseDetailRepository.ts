import type { SupabaseClient } from "@supabase/supabase-js";
import type { Poi, VenueEnrichmentCache, VenueListItem } from "@blockwise/types";
import type {
  UpsertEnrichmentInput,
  VenueDetailRecord,
  VenueDetailRepository,
} from "./detailRepository";

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

// The venue's category is always a leaf (e.g. "Coffee Shop"); its group
// (e.g. "Food & Drink", README §2) is the leaf's parent row. Falls back to
// the category's own name for the rare case it has no parent.
function categoryGroupName(embed: CategoryEmbed[] | CategoryEmbed | null): string | null {
  const category = Array.isArray(embed) ? embed[0] : embed;
  if (!category) return null;
  return categoryName(category.parent ?? null) ?? category.name;
}

export class SupabaseVenueDetailRepository implements VenueDetailRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async listVenues(neighborhoodId: string): Promise<VenueListItem[]> {
    const { data, error } = await this.supabase
      .from("venue")
      .select(
        "id, name, address, lat, lng, category:category_id(name, parent:parent_category_id(name))"
      )
      .eq("neighborhood_id", neighborhoodId)
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

  async getVenueDetail(venueId: string): Promise<VenueDetailRecord | null> {
    const { data: venue, error: venueError } = await this.supabase
      .from("venue")
      .select(
        "id, google_place_id, name, address, lat, lng, claimed_by_business, category:category_id(name), neighborhood:neighborhood_id(slug, name)"
      )
      .eq("id", venueId)
      .maybeSingle();

    if (venueError) throw new Error(`getVenueDetail failed: ${venueError.message}`);
    if (!venue) return null;

    const neighborhoodEmbed = Array.isArray(venue.neighborhood)
      ? venue.neighborhood[0]
      : venue.neighborhood;

    const [{ data: pois, error: poisError }, { data: enrichment, error: enrichmentError }] =
      await Promise.all([
        this.supabase.from("poi").select("id, venue_id, neighborhood_id, name, description, type").eq(
          "venue_id",
          venueId
        ),
        this.supabase
          .from("venue_enrichment_cache")
          .select("venue_id, source, rating, review_snippet, price_tier, photo_url, fetched_at")
          .eq("venue_id", venueId)
          .eq("source", "google")
          .maybeSingle(),
      ]);

    if (poisError) throw new Error(`getVenueDetail (pois) failed: ${poisError.message}`);
    if (enrichmentError)
      throw new Error(`getVenueDetail (enrichment) failed: ${enrichmentError.message}`);

    return {
      id: venue.id,
      googlePlaceId: venue.google_place_id,
      name: venue.name,
      address: venue.address,
      lat: venue.lat,
      lng: venue.lng,
      categoryName: categoryName(venue.category),
      claimedByBusiness: venue.claimed_by_business,
      pois: (pois ?? []) as Poi[],
      enrichment: (enrichment as VenueEnrichmentCache | null) ?? null,
      neighborhoodSlug: neighborhoodEmbed.slug,
      neighborhoodName: neighborhoodEmbed.name,
    };
  }

  async upsertEnrichment(input: UpsertEnrichmentInput): Promise<VenueEnrichmentCache> {
    const { data, error } = await this.supabase
      .from("venue_enrichment_cache")
      .upsert(
        {
          venue_id: input.venueId,
          source: input.source,
          rating: input.rating,
          review_snippet: input.reviewSnippet,
          price_tier: input.priceTier,
          photo_url: input.photoUrl,
          fetched_at: new Date().toISOString(),
        },
        { onConflict: "venue_id,source" }
      )
      .select("venue_id, source, rating, review_snippet, price_tier, photo_url, fetched_at")
      .single();

    if (error) throw new Error(`upsertEnrichment failed: ${error.message}`);
    return data as VenueEnrichmentCache;
  }

  async getEnrichmentPhotoReference(venueId: string): Promise<string | null> {
    const { data, error } = await this.supabase
      .from("venue_enrichment_cache")
      .select("photo_url")
      .eq("venue_id", venueId)
      .eq("source", "google")
      .maybeSingle();

    if (error) throw new Error(`getEnrichmentPhotoReference failed: ${error.message}`);
    return data?.photo_url ?? null;
  }
}
