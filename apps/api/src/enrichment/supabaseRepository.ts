import type { SupabaseClient } from "@supabase/supabase-js";
import type { LocationKind, VenueEnrichmentCache } from "@blockwise/types";
import type { EnrichmentRepository, OpenNowCandidate, UpsertEnrichmentInput } from "./repository";

const ENRICHMENT_COLUMNS =
  "venue_id, source, rating, reviews, price_tier, photo_refs, phone, website, hours, editorial_summary, atmosphere, fetched_at";

function single<T>(embed: T[] | T | null | undefined): T | null {
  if (embed === undefined || embed === null) return null;
  return Array.isArray(embed) ? (embed[0] ?? null) : embed;
}

interface OpenNowRow {
  venue_id: string;
  hours: string[] | null;
  venue: {
    name: string;
    kind: LocationKind;
    category: { name: string } | { name: string }[] | null;
  } | {
    name: string;
    kind: LocationKind;
    category: { name: string } | { name: string }[] | null;
  }[] | null;
}

export class SupabaseEnrichmentRepository implements EnrichmentRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async getEnrichment(locationId: string): Promise<VenueEnrichmentCache | null> {
    const { data, error } = await this.supabase
      .from("venue_enrichment_cache")
      .select(ENRICHMENT_COLUMNS)
      .eq("venue_id", locationId)
      .eq("source", "google")
      .maybeSingle();

    if (error) throw new Error(`getEnrichment failed: ${error.message}`);
    return (data as VenueEnrichmentCache | null) ?? null;
  }

  async upsertEnrichment(input: UpsertEnrichmentInput): Promise<VenueEnrichmentCache> {
    const { data, error } = await this.supabase
      .from("venue_enrichment_cache")
      .upsert(
        {
          venue_id: input.locationId,
          source: input.source,
          rating: input.rating,
          reviews: input.reviews,
          price_tier: input.priceTier,
          photo_refs: input.photoRefs,
          phone: input.phone,
          website: input.website,
          hours: input.hours,
          editorial_summary: input.editorialSummary,
          atmosphere: input.atmosphere,
          fetched_at: new Date().toISOString(),
        },
        { onConflict: "venue_id,source" }
      )
      .select(ENRICHMENT_COLUMNS)
      .single();

    if (error) throw new Error(`upsertEnrichment failed: ${error.message}`);
    return data as VenueEnrichmentCache;
  }

  async getPhotoReference(locationId: string, index: number): Promise<string | null> {
    const { data, error } = await this.supabase
      .from("venue_enrichment_cache")
      .select("photo_refs")
      .eq("venue_id", locationId)
      .eq("source", "google")
      .maybeSingle();

    if (error) throw new Error(`getPhotoReference failed: ${error.message}`);
    return (data?.photo_refs as string[] | undefined)?.[index] ?? null;
  }

  async listOpenNowCandidates(neighborhoodId: string): Promise<OpenNowCandidate[]> {
    const { data, error } = await this.supabase
      .from("venue_enrichment_cache")
      .select(
        "venue_id, hours, venue:venue_id!inner(name, kind, status, neighborhood_id, category:category_id(name))"
      )
      .eq("venue.neighborhood_id", neighborhoodId)
      .eq("venue.status", "active")
      .eq("source", "google")
      .not("hours", "is", null);

    if (error) throw new Error(`listOpenNowCandidates failed: ${error.message}`);

    return ((data ?? []) as unknown as OpenNowRow[])
      .map((row) => {
        const venue = single(row.venue);
        if (!venue || !row.hours) return null;
        const category = single(venue.category);
        const candidate: OpenNowCandidate = {
          id: row.venue_id,
          name: venue.name,
          kind: venue.kind,
          categoryName: category?.name ?? null,
          hours: row.hours,
        };
        return candidate;
      })
      .filter((candidate): candidate is OpenNowCandidate => candidate !== null);
  }
}
