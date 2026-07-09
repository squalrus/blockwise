import Link from "next/link";
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
    return <p className="text-sm text-muted">No points of interest yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {neighborhood.pois.map((poi) => (
        <li key={poi.id} className="rounded-2xl bg-card-alt px-4 py-3 text-sm">
          <div className="flex items-baseline gap-1.5">
            <Link
              href={`/pois/${poi.id}`}
              className="font-extrabold text-foreground hover:text-brand-purple"
            >
              {poi.name}
            </Link>
            <span className="text-xs font-bold text-muted">{poi.type}</span>
          </div>
          {poi.description && <p className="mt-1 text-body-text">{poi.description}</p>}
          <div className="mt-2">
            <CheckInButton target={{ type: "poi", id: poi.id }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
