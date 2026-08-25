"use client";

import type { ActivityItem, MushroomCustomization } from "@blockwise/types";
import { MushroomMark, resolveMushroomConfig } from "@blockwise/ui";
import type { MushroomConfig, MushroomShape, SpotShape } from "@blockwise/ui";
import { BadgeIcon } from "./BadgeIcon";
import { EntityGlyphCircle } from "./EntityTile";
import { useLocalDateTime } from "./useLocalDateTime";

// Server-validated against the same enum a customizer save is checked
// against (PATCH /me/profile), so the shape/spotShape casts are safe to
// trust -- same reasoning as Avatar.tsx/MushroomField.tsx's own copies of
// this exact conversion, which this deliberately doesn't import (a client
// component reaching into another top-level component's internals for a
// six-line cast isn't worth the coupling).
function mushroomConfigFromCustomization(customization: MushroomCustomization | null): MushroomConfig | null {
  if (!customization) return null;
  return {
    ...customization,
    shape: (customization.shape as MushroomShape | undefined) ?? "button",
    spotShape: customization.spotShape as SpotShape,
  };
}

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

// Generic calendar glyph for the event_follow overlap below -- events aren't
// an EntityKind (EntityTile.tsx), so there's no business/poi/neighborhood
// color to borrow; red-on-white instead mirrors EventListItem's own date
// badge (the month text in text-red-600 dark:text-red-400, sitting on a
// bg-card tile), so this reads as "the same event mark" rather than a new
// palette for the same concept.
function CalendarGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2.5" />
      <path d="M3 10h18" stroke="currentColor" strokeWidth="2.5" />
      <path d="M8 3v4M16 3v4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

// Generic achievement glyph for the badge/challenge_completion overlap below
// -- neither is an EntityKind either, but unlike event_follow's calendar
// (borrowed from EventListItem), there's no existing "achievement mark" to
// match, so this is filled solid brand-purple instead -- the same color
// BadgesSection/ChallengesSection already use for their own badge medallions
// -- rather than red-on-white like the calendar circle.
function StarGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2.5 L14.9 9.6 L22.5 10.2 L16.7 15.2 L18.5 22.5 L12 18.5 L5.5 22.5 L7.3 15.2 L1.5 10.2 L9.1 9.6 Z" />
    </svg>
  );
}

// The actor avatar's size, and every overlap circle's size -- kept equal
// (OverlapCluster below) so the actor's own icon reads as the same size on
// every row type.
const OVERLAP_SIZE = 24;
// How far `secondary` tucks behind `primary` -- kept small (not e.g. half
// its width) so more of the second icon reads at a glance rather than being
// mostly hidden.
const OVERLAP_SHIFT = 6;

// Two same-size circles overlapping side by side -- `primary` (the actor,
// always) sits on the left, full and uncropped, in front; `secondary` (the
// other entity, every ActivityType has one: the venue for checkin/favorite,
// the other user for neighbor_connection, a calendar mark for event_follow,
// a star for badge/challenge_completion) sits to its right, partially
// behind it. `primary` alone gets `relative` (with no position at all on
// `secondary`, a plain in-flow sibling always paints below a positioned one
// in the same stacking context, regardless of DOM order) and a ring -- not
// a border -- matching the row's own background (bg-card) to cut a visible
// gap where it overlaps `secondary`, since a border would eat into its box
// and clip the avatar inside it (a ring is a box-shadow, so it doesn't
// shrink the content area).
function OverlapCluster({ primary, secondary }: { primary: React.ReactNode; secondary: React.ReactNode }) {
  return (
    <span className="flex shrink-0 items-center">
      <span
        className="relative flex items-center justify-center rounded-full ring-2 ring-card"
        style={{ height: OVERLAP_SIZE, width: OVERLAP_SIZE }}
      >
        {primary}
      </span>
      <span
        className="flex items-center justify-center"
        style={{ height: OVERLAP_SIZE, width: OVERLAP_SIZE, marginLeft: -OVERLAP_SHIFT }}
      >
        {secondary}
      </span>
    </span>
  );
}

// A row's leading avatar -- resolveMushroomConfig prefers the actor's real
// saved customizer choice (actor_mushroom_customization, never masked by
// visibility -- see that field's own doc comment, packages/types) over a
// deterministic look, same "your own look, not just your seed" rule
// Avatar.tsx/ProfileSummaryCard/the recent-visitor mosaic already follow;
// the seed itself only matters as a fallback once no customization exists.
// Falling back to item.id when actor_username is null works for a masked
// *other* person (a different row is a different private neighbor anyway,
// so an inconsistent fallback look per row isn't wrong so much as
// unverifiable) but breaks down for `self` callers (My Activity, GET
// /me/activity) -- there, actor_username is *always* null (listMyActivity
// clears it deliberately, since a private profile's own /profile/:username
// isn't reachable even to view your own page through), yet every single row
// is provably the same person, so item.id would give "your own" fallback
// look a different, unstable look on every row absent a saved
// customization. `self` (the viewer's real, always-available id) fixes that
// one case without touching the general masked-feed fallback. Every
// ActivityType overlaps the actor with a second icon (OverlapCluster,
// `primary` always the actor, left and on top): checkin/favorite get the
// venue's business/POI mark, neighbor_connection the other user's own
// mushroom, event_follow a generic calendar mark (events aren't an
// EntityKind), badge/challenge_completion a purple star (same brand-purple
// BadgesSection/ChallengesSection already use for their own badge
// medallions) -- except a checkin/favorite row predating the location_kind
// column, which has no second entity to show and falls back to the actor
// alone.
function ActorAvatar({ item, self }: { item: ActivityItem; self?: { id: string } }) {
  const seed = item.actor_username ?? self?.id ?? item.id;
  const config = resolveMushroomConfig(seed, mushroomConfigFromCustomization(item.actor_mushroom_customization));
  const actor = <MushroomMark {...config} size={OVERLAP_SIZE} bg={config.bg} />;

  if ((item.type === "checkin" || item.type === "favorite") && item.location_kind) {
    return <OverlapCluster primary={actor} secondary={<EntityGlyphCircle kind={item.location_kind} size={OVERLAP_SIZE} />} />;
  }

  if (item.type === "neighbor_connection") {
    const otherSeed = item.other_user_username ?? `${item.id}-other`;
    const otherConfig = resolveMushroomConfig(
      otherSeed,
      mushroomConfigFromCustomization(item.other_user_mushroom_customization)
    );
    return (
      <OverlapCluster
        primary={actor}
        secondary={<MushroomMark {...otherConfig} size={OVERLAP_SIZE} bg={otherConfig.bg} />}
      />
    );
  }

  if (item.type === "event_follow") {
    return (
      <OverlapCluster
        primary={actor}
        secondary={
          <span className="flex h-full w-full items-center justify-center rounded-full border border-border bg-card text-red-600 dark:text-red-400">
            <CalendarGlyph />
          </span>
        }
      />
    );
  }

  if (item.type === "badge" || item.type === "challenge_completion") {
    return (
      <OverlapCluster
        primary={actor}
        secondary={
          <span className="flex h-full w-full items-center justify-center rounded-full bg-brand-purple text-on-accent">
            <StarGlyph />
          </span>
        }
      />
    );
  }

  // A checkin/favorite row predating the location_kind column (its own doc
  // comment, packages/types) -- no second entity worth showing, so it's
  // just the actor alone, still at OVERLAP_SIZE rather than growing to fill
  // the row's leading column.
  return <span className="shrink-0">{actor}</span>;
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
export function ActivityFeed({
  items,
  emptyMessage,
  // The viewer's own id -- only meaningful (and only ever passed) for My
  // Activity, where every row's actor is provably the signed-in viewer
  // despite actor_username always being null there; see ActorAvatar's doc
  // comment. Their saved mushroom customization doesn't need to travel
  // through this prop at all -- it comes from item.actor_mushroom_
  // customization like every other row's, self-view or not. Every other
  // caller (neighborhood-wide/Spore Feed) leaves this unset, unaffected.
  self,
}: {
  items: ActivityItem[];
  emptyMessage: string;
  self?: { id: string };
}) {
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
                <ActorAvatar item={item} self={self} />
                <p className="min-w-0 flex-1 text-sm font-semibold text-body-text">
                  <Description item={item} />
                  {item.type === "badge" && (
                    <span className="ml-1.5 inline-flex align-middle">
                      <BadgeIcon icon={item.badge_icon} name={item.badge_name ?? "Badge"} />
                    </span>
                  )}
                </p>
                {item.points_earned != null && item.points_earned > 0 && (
                  <span className="shrink-0 rounded-full bg-brand-green/15 px-2 py-0.5 text-[10px] font-extrabold text-brand-green">
                    +{item.points_earned} pts
                  </span>
                )}
                <RowTimestamp occurredAt={item.occurred_at} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
