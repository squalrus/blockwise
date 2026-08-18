"use client";

import { useEffect, useState } from "react";
import type { ActivityItem, CouponWithClaim, Event, FollowedEventSummary } from "@blockwise/types";
import { MushroomLoader } from "@blockwise/ui";
import { getAccessToken } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";
import { ActivityFeed } from "../../ActivityFeed";
import { EventListItem } from "../../EventListItem";
import { FollowEventButton } from "../../FollowEventButton";
import { CouponCard } from "../../location/[id]/CouponCard";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      followedEvents: FollowedEventSummary[];
      favoriteEvents: Event[];
      coupons: CouponWithClaim[];
      feed: ActivityItem[];
    };

// An event counts as "today" if its start/end range overlaps today's local
// calendar day, mirroring apps/api/src/locations/happeningNow.ts's isToday
// (same overlap definition, kept in sync manually since this is a client
// component and that helper lives server-side). GET /me/events and
// GET /me/events-from-favorites already exclude events whose end_time has
// passed, so this only ever needs to exclude events that haven't started yet.
function isEventToday(event: Event): boolean {
  const start = new Date(event.start_time).getTime();
  const end = new Date(event.end_time).getTime();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
  return start < todayEnd && end >= todayStart;
}

async function load(setState: (state: State) => void) {
  const token = await getAccessToken();
  const headers = { Authorization: `Bearer ${token}` };
  const [followedEventsRes, favoriteEventsRes, couponsRes, feedRes] = await Promise.all([
    fetch(clientApiUrl("/me/events"), { headers }),
    fetch(clientApiUrl("/me/events-from-favorites"), { headers }),
    fetch(clientApiUrl("/me/coupons"), { headers }),
    fetch(clientApiUrl("/me/feed"), { headers }),
  ]);

  if (!followedEventsRes.ok || !favoriteEventsRes.ok || !couponsRes.ok || !feedRes.ok) {
    setState({ status: "error", message: "Failed to load your account" });
    return;
  }

  setState({
    status: "ready",
    followedEvents: await followedEventsRes.json(),
    favoriteEvents: await favoriteEventsRes.json(),
    coupons: await couponsRes.json(),
    feed: await feedRes.json(),
  });
}

// BACKLOG.md Ref 81: check-ins, favorites, badge unlocks, challenge
// completions, and followed events from accepted neighbor connections
// (GET /me/feed) -- not neighborhood-wide, unlike
// /neighborhoods/:slug's own Spore feed tab. Default tab (the
// bare /account route) since it's meant to be the first thing you see
// landing on your account. Any of your own followed events happening
// today, today's events at venues you favorite (BACKLOG.md Ref 87 --
// de-duped against the followed-events list below so an event you've both
// favorited-the-venue-of and individually followed isn't shown twice), and
// active coupons at venues you favorite (BACKLOG.md Ref 83), are pinned
// above the chronological activity log the same way the neighborhood
// profile's Today tab pins events.
export default function SporeFeedPage() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    load(setState);
  }, []);

  if (state.status === "loading") {
    return (
      <div className="flex min-h-[30vh] items-center justify-center">
        <MushroomLoader size={56} />
      </div>
    );
  }

  if (state.status === "error") {
    return <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>;
  }

  const todaysFollowedEvents = state.followedEvents.filter(isEventToday);
  const followedEventIds = new Set(todaysFollowedEvents.map((e) => e.id));
  // Excludes anything already in todaysFollowedEvents -- a venue you favorite
  // and an event at it you've also individually followed should only render
  // once, in the followed list above.
  const todaysFavoriteEvents = state.favoriteEvents.filter((e) => isEventToday(e) && !followedEventIds.has(e.id));
  const todaysEvents = [...todaysFollowedEvents, ...todaysFavoriteEvents].sort((a, b) =>
    a.start_time.localeCompare(b.start_time)
  );

  return (
    <section className="flex flex-col gap-5">
      {(todaysEvents.length > 0 || state.coupons.length > 0) && (
        <div className="flex flex-col gap-2.5">
          <h2 className="text-xs font-extrabold text-muted">Today</h2>
          {state.coupons.length > 0 && (
            <ul className="flex flex-col gap-2.5">
              {state.coupons.map((coupon) => (
                <CouponCard key={coupon.id} coupon={coupon} signedIn />
              ))}
            </ul>
          )}
          {todaysEvents.length > 0 && (
            <ul className="flex flex-col gap-2.5">
              {todaysEvents.map((event) => (
                <EventListItem
                  key={event.id}
                  event={event}
                  showSource={false}
                  actions={<FollowEventButton eventId={event.id} />}
                />
              ))}
            </ul>
          )}
        </div>
      )}
      <ActivityFeed
        items={state.feed}
        emptyMessage="No activity yet -- connect with a neighbor to see what they're up to."
      />
    </section>
  );
}
