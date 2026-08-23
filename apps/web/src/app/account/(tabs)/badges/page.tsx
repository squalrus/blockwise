"use client";

import { useEffect, useState } from "react";
import type { Badge, UserBadge } from "@blockwise/types";
import { MushroomLoader } from "@blockwise/ui";
import { getAccessToken } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";
import { BadgeIcon } from "../../../BadgeIcon";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  // BACKLOG.md Ref 61: every badge that exists, cross-referenced against
  // `badges` (earned) to render locked placeholders too.
  | { status: "ready"; badges: UserBadge[]; badgeCatalog: Badge[] };

// Tiered badge code prefixes excluded from the locked preview below --
// unlike a single one-off badge (e.g. "back_for_seconds"), previewing every
// tier of one of these ladders would be noise rather than a helpful "what's
// next" hint: forager_ (collection_milestone, 10 through 1000, ~28 badges),
// level_ (level_reached, 1 through 20, 20260823010000_level_20_badges.sql),
// good_neighbor_ (neighbor_count_reached, 1 through 50), and day_tripper_
// (daily_distinct_venues, 5 through 50). All four are still shown normally,
// alongside everything else, once actually earned (state.badges below isn't
// filtered) -- and still flash in the check-in "unlocked" popup
// (CheckinResultCard.tsx) the moment they're earned.
const HIDDEN_UNTIL_EARNED_PREFIXES = ["forager_", "level_", "good_neighbor_", "day_tripper_"];

async function load(setState: (state: State) => void) {
  const token = await getAccessToken();
  const headers = { Authorization: `Bearer ${token}` };
  const [badgesRes, catalogRes] = await Promise.all([
    fetch(clientApiUrl("/me/badges"), { headers }),
    fetch(clientApiUrl("/badges")),
  ]);

  if (!badgesRes.ok || !catalogRes.ok) {
    setState({ status: "error", message: "Failed to load your account" });
    return;
  }

  setState({
    status: "ready",
    badges: await badgesRes.json(),
    badgeCatalog: await catalogRes.json(),
  });
}

export default function BadgesPage() {
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

  const earnedIds = new Set(state.badges.map((b) => b.badge.id));
  const locked = state.badgeCatalog.filter(
    (b) => !earnedIds.has(b.id) && !HIDDEN_UNTIL_EARNED_PREFIXES.some((prefix) => b.code.startsWith(prefix))
  );

  if (state.badges.length === 0 && locked.length === 0) {
    return <p className="text-sm text-muted">No badges yet -- complete a neighborhood challenge to earn one.</p>;
  }

  return (
    <section className="flex flex-col gap-2.5">
      <ul className="flex flex-col gap-2">
        {state.badges.map((userBadge) => (
          <li key={userBadge.badge.id} className="flex items-center gap-3 rounded-2xl bg-card-alt px-4 py-3.5">
            <span className="flex h-13 w-13 shrink-0 items-center justify-center rounded-full border-[3px] border-foreground bg-brand-purple text-2xl">
              <BadgeIcon icon={userBadge.badge.icon} name={userBadge.badge.name} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-foreground">{userBadge.badge.name}</p>
              {userBadge.badge.description && (
                <p className="mt-0.5 text-xs text-body-text">{userBadge.badge.description}</p>
              )}
              <p className="mt-1 text-[11px] font-bold text-muted">
                Unlocked {new Date(userBadge.awarded_at).toLocaleString()}
              </p>
            </div>
          </li>
        ))}
        {locked.map((badge) => (
          <li key={badge.id} className="flex items-center gap-3 rounded-2xl bg-card-alt px-4 py-3.5 opacity-40">
            <span className="flex h-13 w-13 shrink-0 items-center justify-center rounded-full border-[3px] border-dashed border-foreground bg-card text-2xl grayscale">
              <BadgeIcon icon={badge.icon} name={badge.name} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-foreground">{badge.name}</p>
              {badge.description && <p className="mt-0.5 text-xs text-body-text">{badge.description}</p>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
