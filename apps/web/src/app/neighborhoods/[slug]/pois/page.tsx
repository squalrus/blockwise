import type { NeighborhoodProfile } from "@blockwise/types";
import { apiUrl } from "@/lib/api";
import { CheckInButton } from "../../../venues/[id]/CheckInButton";

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
    return <p className="text-sm text-zinc-600 dark:text-zinc-400">No points of interest yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {neighborhood.pois.map((poi) => (
        <li
          key={poi.id}
          className="rounded-lg border border-black/[.08] px-4 py-3 text-sm dark:border-white/[.145]"
        >
          <span className="font-medium text-black dark:text-zinc-50">{poi.name}</span>
          <span className="ml-2 text-zinc-600 dark:text-zinc-400">{poi.type}</span>
          {poi.description && (
            <p className="mt-1 text-zinc-600 dark:text-zinc-400">{poi.description}</p>
          )}
          <div className="mt-2">
            <CheckInButton target={{ type: "poi", id: poi.id }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
