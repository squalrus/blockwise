import type { ActivityItem } from "@blockwise/types";
import { BadgeIcon } from "./BadgeIcon";
import { Timeline } from "./Timeline";

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

function OtherUserLink({ item }: { item: ActivityItem }) {
  if (!item.other_user_username) return <>{item.other_user_name ?? "a neighbor"}</>;
  return (
    <a href={`/profile/${item.other_user_username}`} className="hover:text-brand-purple">
      {item.other_user_name}
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
    case "event_follow":
      return (
        <>
          <ActorLink item={item} /> followed {item.event_title ? `${item.event_title} event` : "an event"}
        </>
      );
    case "neighbor_connection":
      return (
        <>
          <ActorLink item={item} /> connected with <OtherUserLink item={item} />
        </>
      );
  }
}

// Shared by the neighborhood-wide Recent activity tab (BACKLOG.md Ref 27)
// and /account's Spore Feed tab (BACKLOG.md Ref 81, connections-scoped
// instead of neighborhood-scoped) -- both render the same ActivityItem[]
// shape through the same Timeline UI CheckinTimeline uses, so every
// chronological feed in the app reads consistently.
export function ActivityFeed({ items, emptyMessage }: { items: ActivityItem[]; emptyMessage: string }) {
  return (
    <Timeline
      emptyMessage={emptyMessage}
      items={items.map((item) => ({
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
