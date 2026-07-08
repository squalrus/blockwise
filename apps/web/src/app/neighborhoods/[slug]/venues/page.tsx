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

// BACKLOG.md Ref 44: Venues tab.
export default async function NeighborhoodVenuesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const neighborhood = await getNeighborhood(slug);
  if (!neighborhood) return null;

  const venues = await getVenues(neighborhood.id);

  return <VenuesView venues={venues} />;
}
