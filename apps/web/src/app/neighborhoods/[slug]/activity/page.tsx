import type { Metadata } from "next";
import type { ActivityItem, NeighborhoodProfile } from "@blockwise/types";
import { apiUrl } from "@/lib/api";
import { BadgeIcon } from "../../../BadgeIcon";
import { Timeline } from "../../../Timeline";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return { alternates: { canonical: `/neighborhoods/${slug}/activity` } };
}

async function getNeighborhood(slug: string): Promise<NeighborhoodProfile | null> {
  const res = await fetch(apiUrl(`/neighborhoods/${slug}`), { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load neighborhood ${slug}: ${res.status}`);
  return (await res.json()) as NeighborhoodProfile;
}

async function getActivity(id: string): Promise<ActivityItem[]> {
  const res = await fetch(apiUrl(`/neighborhoods/${id}/activity`), { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load activity for neighborhood ${id}: ${res.status}`);
  return (await res.json()) as ActivityItem[];
}

// Actor/venue names render as their own links (to the public profile /
// location detail page) rather than the whole sentence linking to just one
// of the two -- either can be null (private actor, or a badge/challenge row
// with no venue), in which case that piece falls back to plain text.
function ActorLink({ item }: { item: ActivityItem }) {
  if (!item.actor_username) return <>{item.actor_name}</>;
  return (
    <a href={`/profile/${item.actor_username}`} className="hover:text-brand-purple">
      {item.actor_name}
    </a>
  );
}

function VenueLink({ item }: { item: ActivityItem }) {
  const name = item.venue_name ?? "a location";
  if (!item.venue_id) return <>{name}</>;
  return (
    <a href={`/location/${item.venue_id}`} className="hover:text-brand-purple">
      {name}
    </a>
  );
}

function Description({ item }: { item: ActivityItem }) {
  switch (item.type) {
    case "checkin":
      return (
        <>
          <ActorLink item={item} /> checked in at <VenueLink item={item} />
        </>
      );
    case "favorite":
      return (
        <>
          <ActorLink item={item} /> favorited <VenueLink item={item} />
        </>
      );
    case "challenge_completion":
      return (
        <>
          <ActorLink item={item} /> completed the {item.challenge_title ?? "a"} challenge
        </>
      );
    case "badge":
      return (
        <>
          <ActorLink item={item} /> unlocked the {item.badge_name ?? ""} badge
        </>
      );
  }
}

// BACKLOG.md Ref 27: Recent activity tab -- a neighborhood-wide feed of
// check-ins, favorites, challenge completions, and badge unlocks, with actor
// names already masked server-side per profile visibility. Uses the same
// Timeline UI as CheckinTimeline (account/profile pages' "Recent check-ins")
// so chronological feeds read consistently across the app.
export default async function NeighborhoodActivityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const neighborhood = await getNeighborhood(slug);
  if (!neighborhood) return null;

  const activity = await getActivity(neighborhood.id);

  return (
    <Timeline
      emptyMessage="No activity yet."
      items={activity.map((item) => ({
        key: item.id,
        primary: (
          <span className="inline-flex items-center gap-1.5 text-sm font-extrabold text-foreground">
            <Description item={item} />
            {item.type === "badge" && <BadgeIcon icon={item.badge_icon} name={item.badge_name ?? "Badge"} />}
          </span>
        ),
        timestamp: item.occurred_at,
      }))}
    />
  );
}
