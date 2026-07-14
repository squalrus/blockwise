import type { MetadataRoute } from "next";
import type { NeighborhoodSummary, VenueListItem } from "@blockwise/types";
import { apiUrl } from "@/lib/api";
import { SITE_URL } from "@/lib/siteUrl";

async function listNeighborhoods(): Promise<NeighborhoodSummary[]> {
  const res = await fetch(apiUrl("/neighborhoods"), { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to list neighborhoods for sitemap: ${res.status}`);
  return (await res.json()) as NeighborhoodSummary[];
}

// GET /neighborhoods/:id/venues already filters to active, business-kind
// locations (apps/api/src/locations/supabaseRepository.ts) -- POIs and
// hidden/removed locations are excluded, so nothing here needs its own
// status check.
async function listVenues(neighborhoodId: string): Promise<VenueListItem[]> {
  const res = await fetch(apiUrl(`/neighborhoods/${neighborhoodId}/venues`), { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to list venues for sitemap (neighborhood ${neighborhoodId}): ${res.status}`);
  return (await res.json()) as VenueListItem[];
}

// Dynamic, unlike apps/marketing's static sitemap -- covers every active
// neighborhood and its claimable venues (BACKLOG.md Ref 70). Public user
// profiles are deliberately excluded (see profile/[username]/page.tsx's
// noindex default) rather than enumerated here.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const neighborhoods = await listNeighborhoods();

  const neighborhoodEntries: MetadataRoute.Sitemap = neighborhoods.map((n) => ({
    url: `${SITE_URL}/neighborhoods/${n.slug}`,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  const venueLists = await Promise.all(neighborhoods.map((n) => listVenues(n.id)));
  const venueEntries: MetadataRoute.Sitemap = venueLists.flat().map((v) => ({
    url: `${SITE_URL}/location/${v.id}`,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [
    { url: `${SITE_URL}/neighborhoods`, changeFrequency: "weekly", priority: 0.9 },
    ...neighborhoodEntries,
    ...venueEntries,
  ];
}
