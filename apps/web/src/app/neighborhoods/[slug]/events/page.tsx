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

// BACKLOG.md Ref 44: Upcoming events tab.
export default async function NeighborhoodEventsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const neighborhood = await getNeighborhood(slug);
  if (!neighborhood) return null;

  const events = await getEvents(neighborhood.id);

  if (events.length === 0) {
    return <p className="text-sm text-muted">No upcoming events.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {events.map((e) => (
        <li key={e.id} className="rounded-2xl bg-card-alt px-4 py-4 text-sm">
          <span className="font-extrabold text-foreground">{e.title}</span>
          <p className="mt-1 text-body-text">{e.description}</p>
          <p className="mt-1.5 text-xs font-bold text-muted">
            {new Date(e.start_time).toLocaleString()} – {new Date(e.end_time).toLocaleString()}
          </p>
        </li>
      ))}
    </ul>
  );
}
