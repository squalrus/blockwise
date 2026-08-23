"use client";

import type { ActivityItem } from "@blockwise/types";
import { MushroomMark, mushroomConfigForUser } from "@blockwise/ui";
import { BadgeIcon } from "./BadgeIcon";
import { useLocalDateTime } from "./useLocalDateTime";

function formatShortTime(date: Date): string {
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

// "Today" / "Yesterday" / "Aug 20" -- compares local calendar-day boundaries
// (not a raw 24h delta) against the viewer's own "now", so a row from 11pm
// yesterday and one from 1am today never both read as "today" or get an
// off-by-one day label.
function dayLabel(occurredAt: string, now: Date): string {
  const date = new Date(occurredAt);
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return date.toLocaleString(undefined, { month: "short", day: "numeric" });
}

// Buckets items into day-labeled groups, preserving first-seen order (items
// already arrive chronologically sorted from the API, so same-day items
// stay contiguous). `now === null` (pre-mount, see ActivityFeed below) folds
// everything into a single unlabeled group rather than guessing -- the
// group headers only appear once the viewer's actual local day is known.
function groupByDay(items: ActivityItem[], now: Date | null): { label: string; items: ActivityItem[] }[] {
  if (now === null) return items.length > 0 ? [{ label: "", items }] : [];

  const groups: { label: string; items: ActivityItem[] }[] = [];
  for (const item of items) {
    const label = dayLabel(item.occurred_at, now);
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup.label === label) {
      lastGroup.items.push(item);
    } else {
      groups.push({ label, items: [item] });
    }
  }
  return groups;
}

// A row's leading avatar -- ActivityItem never carries the actor's real
// avatar/customization (masked server-side along with the rest of their
// identity for a private actor), so this is a stable deterministic look
// keyed off whatever public identifier is available, same idea as any other
// mushroomConfigForUser call site.
function ActorAvatar({ item }: { item: ActivityItem }) {
  const config = mushroomConfigForUser(item.actor_username ?? item.id);
  return (
    <span className="shrink-0">
      <MushroomMark {...config} size={28} bg={config.bg} />
    </span>
  );
}

function RowTimestamp({ occurredAt }: { occurredAt: string }) {
  const formatted = useLocalDateTime(occurredAt, formatShortTime);
  return <span className="shrink-0 font-mono text-[10px] font-medium text-muted">{formatted}</span>;
}

// Actor/venue names render as their own links (to the public profile /
// location detail page) rather than the whole sentence linking to just one
// of the two -- either can be null (private actor, or a badge/challenge row
// with no venue), in which case that piece falls back to plain text.
// The bold-ink treatment (font-extrabold text-foreground) marks these as the
// sentence's "subjects" against the surrounding regular-weight verb text,
// whether or not they're actually clickable.
const NAME_CLASS = "font-extrabold text-foreground hover:text-brand-purple";

function ActorLink({ item }: { item: ActivityItem }) {
  if (!item.actor_username) return <span className={NAME_CLASS}>{item.actor_name}</span>;
  return (
    <a href={`/profile/${item.actor_username}`} className={NAME_CLASS}>
      {item.actor_name}
    </a>
  );
}

function VenueLink({ item }: { item: ActivityItem }) {
  const name = item.venue_name ?? "a location";
  if (!item.venue_id) return <span className={NAME_CLASS}>{name}</span>;
  return (
    <a href={`/location/${item.venue_id}`} className={NAME_CLASS}>
      {name}
    </a>
  );
}

function OtherUserLink({ item }: { item: ActivityItem }) {
  if (!item.other_user_username) return <span className={NAME_CLASS}>{item.other_user_name ?? "a neighbor"}</span>;
  return (
    <a href={`/profile/${item.other_user_username}`} className={NAME_CLASS}>
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

// Shared by the neighborhood-wide Spore feed tab (BACKLOG.md Ref 27),
// /account's Spore Feed tab, and /account/activity's My Activity tab
// (BACKLOG.md Ref 81, connections-/self-scoped instead of
// neighborhood-scoped) -- all render the same ActivityItem[] shape through
// this same day-grouped, avatar-per-row layout, so every chronological feed
// in the app reads consistently. (CheckinTimeline's recent-check-ins list is
// a different shape entirely -- it keeps the older dot-and-line Timeline.)
//
// `now` -- and therefore every group's day label -- resolves post-mount
// (useLocalDateTime's documented "now" mode, omitting isoString) so a
// server-rendered caller (the neighborhood feed page is an async Server
// Component with no client loading gate) doesn't guess the viewer's local
// day at SSR time and risk a hydration mismatch: the first paint (server and
// client alike) always renders the `now === null` single-group fallback from
// groupByDay above, then an effect fills in the real Today/Yesterday/date
// headers once mounted.
export function ActivityFeed({ items, emptyMessage }: { items: ActivityItem[]; emptyMessage: string }) {
  const now = useLocalDateTime(undefined, (d) => d);
  const groups = groupByDay(items, now);

  if (groups.length === 0) {
    return <p className="text-sm text-muted">{emptyMessage}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group, groupIndex) => (
        <div key={group.label || groupIndex} className="flex flex-col gap-2">
          {group.label && (
            <h2 className="text-[11px] font-extrabold tracking-wide text-muted uppercase">{group.label}</h2>
          )}
          <div className="rounded-2xl bg-card px-4">
            {group.items.map((item, rowIndex) => (
              <div
                key={item.id}
                className={`flex items-center gap-3 py-2.5 ${rowIndex > 0 ? "border-t border-background" : ""}`}
              >
                <ActorAvatar item={item} />
                <p className="min-w-0 flex-1 text-sm font-semibold text-body-text">
                  <Description item={item} />
                  {item.type === "badge" && (
                    <span className="ml-1.5 inline-flex align-middle">
                      <BadgeIcon icon={item.badge_icon} name={item.badge_name ?? "Badge"} />
                    </span>
                  )}
                </p>
                <RowTimestamp occurredAt={item.occurred_at} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
