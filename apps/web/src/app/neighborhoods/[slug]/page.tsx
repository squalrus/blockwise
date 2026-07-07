import Link from "next/link";
import { notFound } from "next/navigation";
import type { Event, NeighborhoodProfile } from "@blockwise/types";
import { apiUrl } from "@/lib/api";

async function getNeighborhood(slug: string): Promise<NeighborhoodProfile | null> {
  const res = await fetch(apiUrl(`/neighborhoods/${slug}`), { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load neighborhood ${slug}: ${res.status}`);
  return (await res.json()) as NeighborhoodProfile;
}

async function getEvents(id: string): Promise<Event[]> {
  const res = await fetch(apiUrl(`/neighborhoods/${id}/events`), { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load events for neighborhood ${id}: ${res.status}`);
  return (await res.json()) as Event[];
}

// Neighborhood profile pages (BACKLOG.md): the neighborhood-scoped equivalent
// of the venue detail page (venues/[id]/page.tsx) -- a description, upcoming
// events, and neighborhood-owned POIs (parks, transit, landmarks not tied to
// any single venue). Authoring happens from /neighborhood-admin/[id].
export default async function NeighborhoodProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const neighborhood = await getNeighborhood(slug);

  if (!neighborhood) notFound();

  const events = await getEvents(neighborhood.id);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-16 font-sans">
      <Link href="/venues" className="text-sm text-zinc-600 hover:underline dark:text-zinc-400">
        ← All venues
      </Link>

      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          {neighborhood.name}
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {neighborhood.city}, {neighborhood.state}
        </p>
      </div>

      {neighborhood.description && (
        <p className="text-sm text-zinc-700 dark:text-zinc-300">{neighborhood.description}</p>
      )}

      {events.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Upcoming events</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {events.map((e) => (
              <li
                key={e.id}
                className="rounded-lg border border-black/[.08] px-4 py-3 text-sm dark:border-white/[.145]"
              >
                <span className="font-medium text-black dark:text-zinc-50">{e.title}</span>
                <p className="mt-1 text-zinc-600 dark:text-zinc-400">{e.description}</p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                  {new Date(e.start_time).toLocaleString()} – {new Date(e.end_time).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {neighborhood.pois.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
            Points of interest
          </h2>
          <ul className="mt-2 flex flex-col gap-2">
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
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
