import type { Metadata } from "next";
import type { Event, NeighborhoodProfile } from "@blockwise/types";
import { apiUrl } from "@/lib/api";
import { EventListItem } from "../../../EventListItem";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return { alternates: { canonical: `/neighborhoods/${slug}/events` } };
}

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
    <ul className="flex flex-col gap-2.5">
      {events.map((e) => (
        <EventListItem key={e.id} event={e} showSource={false} />
      ))}
    </ul>
  );
}
