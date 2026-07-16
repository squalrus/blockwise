import type { Metadata } from "next";
import type { HappeningNow, NeighborhoodProfile } from "@blockwise/types";
import { apiUrl } from "@/lib/api";
import { EventListItem } from "../../EventListItem";
import { PlaceListItem } from "../../PlaceListItem";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return { alternates: { canonical: `/neighborhoods/${slug}` } };
}

async function getNeighborhood(slug: string): Promise<NeighborhoodProfile | null> {
  const res = await fetch(apiUrl(`/neighborhoods/${slug}`), { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load neighborhood ${slug}: ${res.status}`);
  return (await res.json()) as NeighborhoodProfile;
}

async function getHappeningNow(id: string): Promise<HappeningNow> {
  const res = await fetch(apiUrl(`/neighborhoods/${id}/happening-now`), { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load what's happening now for neighborhood ${id}: ${res.status}`);
  return (await res.json()) as HappeningNow;
}

// BACKLOG.md Ref 27: Today tab (renamed from "Happening now"), the default
// route for the neighborhood profile (see NeighborhoodTabs.tsx) -- events
// happening today (in progress or later today, not just this exact instant)
// plus businesses/POIs whose cached hours say they're open right now.
export default async function NeighborhoodTodayPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const neighborhood = await getNeighborhood(slug);
  if (!neighborhood) return null;

  const happeningNow = await getHappeningNow(neighborhood.id);

  if (happeningNow.today_events.length === 0 && happeningNow.open_now.length === 0) {
    return <p className="text-sm text-muted">Nothing happening today.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h2 className="font-heading text-lg font-extrabold text-foreground">Today's events</h2>
        {happeningNow.today_events.length === 0 ? (
          <p className="text-sm text-muted">No events happening today.</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {happeningNow.today_events.map((e) => (
              <EventListItem key={e.id} event={e} showSource={false} />
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-heading text-lg font-extrabold text-foreground">Open now</h2>
        {happeningNow.open_now.length === 0 ? (
          <p className="text-sm text-muted">Nothing known to be open right now.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {happeningNow.open_now.map((location) => (
              <li key={location.id}>
                <PlaceListItem
                  href={`/location/${location.id}`}
                  id={location.id}
                  name={location.name}
                  subtitle={location.category_name ?? (location.kind === "poi" ? "Point of interest" : "")}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
