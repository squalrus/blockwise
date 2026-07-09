import type { NeighborhoodProfile } from "@blockwise/types";
import { apiUrl } from "@/lib/api";
import { PlaceListItem } from "../../../PlaceListItem";

async function getNeighborhood(slug: string): Promise<NeighborhoodProfile | null> {
  const res = await fetch(apiUrl(`/neighborhoods/${slug}`), { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load neighborhood ${slug}: ${res.status}`);
  return (await res.json()) as NeighborhoodProfile;
}

// BACKLOG.md Ref 44: Points of interest tab.
export default async function NeighborhoodPoisPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const neighborhood = await getNeighborhood(slug);
  if (!neighborhood) return null;

  if (neighborhood.pois.length === 0) {
    return <p className="text-sm text-muted">No points of interest yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {neighborhood.pois.map((poi) => (
        <li key={poi.id}>
          <PlaceListItem href={`/pois/${poi.id}`} id={poi.id} name={poi.name} subtitle={poi.type} />
        </li>
      ))}
    </ul>
  );
}
