import type { Metadata } from "next";
import type { Event } from "@blockwise/types";
import { apiUrl } from "@/lib/api";
import { EventListItem } from "../../../EventListItem";
import { FollowEventButton } from "../../../FollowEventButton";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return { alternates: { canonical: `/location/${id}/events` } };
}

// Business owner venue dashboard (BACKLOG.md): read-only display of a
// claimed business's own events, authored from the owner-side dashboard
// (/business/[venueId]).
async function getEvents(id: string): Promise<Event[]> {
  const res = await fetch(apiUrl(`/venues/${id}/events`), { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load events for venue ${id}: ${res.status}`);
  return (await res.json()) as Event[];
}

// Events tab (BACKLOG.md Ref 101 redesign), business-kind only -- a POI can
// never be claimed, so it never has events.
export default async function LocationEventsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const events = await getEvents(id);

  if (events.length === 0) {
    return <p className="text-sm text-muted">No upcoming events.</p>;
  }

  return (
    <ul className="flex flex-col gap-2.5">
      {events.map((e) => (
        <EventListItem key={e.id} event={e} showSource={false} actions={<FollowEventButton eventId={e.id} />} />
      ))}
    </ul>
  );
}
