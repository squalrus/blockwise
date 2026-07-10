import type { NeighborhoodProfile, VenueListItem } from "@blockwise/types";
import { apiUrl } from "@/lib/api";
import { VenuesView } from "../VenuesView";

async function getNeighborhood(slug: string): Promise<NeighborhoodProfile | null> {
  const res = await fetch(apiUrl(`/neighborhoods/${slug}`), { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load neighborhood ${slug}: ${res.status}`);
  return (await res.json()) as NeighborhoodProfile;
}

async function getVenues(id: string): Promise<VenueListItem[]> {
  const res = await fetch(apiUrl(`/neighborhoods/${id}/venues`), { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load venues for neighborhood ${id}: ${res.status}`);
  return (await res.json()) as VenueListItem[];
}

// BACKLOG.md Ref 44: Locations tab -- merges businesses (renamed from
// Venues) and neighborhood-owned POIs (folded in from the former Points of
// interest tab) into one list/map, mirroring the admin Locations tab
// (BACKLOG.md "POIs and venues managed almost the same"). POIs with no
// cached lat/lng (BACKLOG.md Ref 51's known issue) are excluded rather than
// plotted at a bogus position.
export default async function NeighborhoodLocationsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const neighborhood = await getNeighborhood(slug);
  if (!neighborhood) return null;

  const venues = await getVenues(neighborhood.id);
  const pois: VenueListItem[] = neighborhood.pois
    .filter((poi) => poi.lat !== null && poi.lng !== null)
    .map((poi) => ({
      id: poi.id,
      name: poi.name,
      address: poi.address ?? "",
      lat: poi.lat as number,
      lng: poi.lng as number,
      category_name: poi.type,
      category_group: null,
    }));

  return <VenuesView venues={[...venues, ...pois]} />;
}
