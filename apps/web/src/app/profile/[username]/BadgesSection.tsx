"use client";

import { useEffect, useState } from "react";
import type { UserBadge } from "@blockwise/types";
import { clientApiUrl } from "@/lib/clientApi";
import { BadgeIcon } from "../../BadgeIcon";

const PAGE_SIZE = 10;

// Caps a public profile's full badge list at PAGE_SIZE with a "load more"
// footer rather than dumping every earned badge at once -- a heavily-badged
// account could otherwise turn this section into most of the page. Card
// markup mirrors /account/(tabs)/badges' own earned-badge row exactly, since
// the profile page shows the same full list, just to a different viewer.
export function BadgesSection({ badges }: { badges: UserBadge[] }) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  // Badge.neighborhood_id (BACKLOG.md Ref 108 follow-up) names a
  // neighborhood but doesn't carry its name -- resolved client-side against
  // the public neighborhood list rather than denormalizing a name onto the
  // badge DTO, since every badge-displaying surface can cheaply fetch this
  // once. Not gated on badges.length: an empty/error fetch just means no
  // pills render, never a broken page.
  const [neighborhoodNames, setNeighborhoodNames] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    let cancelled = false;
    fetch(clientApiUrl("/neighborhoods"))
      .then((res) => (res.ok ? res.json() : []))
      .then((neighborhoods: { id: string; name: string }[]) => {
        if (!cancelled) setNeighborhoodNames(new Map(neighborhoods.map((n) => [n.id, n.name])));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (badges.length === 0) {
    return <p className="text-sm text-muted">No badges earned yet.</p>;
  }

  const visible = badges.slice(0, visibleCount);
  const remaining = badges.length - visible.length;

  return (
    <>
      <ul className="flex flex-col gap-2">
        {visible.map((userBadge) => (
          <li key={userBadge.badge.id} className="flex items-center gap-3 rounded-2xl bg-card-alt px-4 py-3.5">
            <span className="flex h-13 w-13 shrink-0 items-center justify-center rounded-full border-[3px] border-foreground bg-brand-purple text-2xl">
              <BadgeIcon icon={userBadge.badge.icon} name={userBadge.badge.name} />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="text-sm font-extrabold text-foreground">{userBadge.badge.name}</p>
                {userBadge.badge.neighborhood_id && (
                  <span className="rounded-full bg-brand-purple px-1.5 py-0.5 text-[10px] font-extrabold text-on-accent">
                    {neighborhoodNames.get(userBadge.badge.neighborhood_id) ?? "Neighborhood"}
                  </span>
                )}
              </div>
              {userBadge.badge.description && (
                <p className="mt-0.5 text-xs text-body-text">{userBadge.badge.description}</p>
              )}
              <p className="mt-1 text-[11px] font-bold text-muted">
                Unlocked {new Date(userBadge.awarded_at).toLocaleString()}
              </p>
            </div>
          </li>
        ))}
      </ul>
      {remaining > 0 && (
        <button
          type="button"
          onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
          className="rounded-2xl border border-dashed border-border px-4 py-2.5 text-center text-xs font-extrabold text-muted hover:border-brand-purple hover:text-brand-purple"
        >
          Show {Math.min(remaining, PAGE_SIZE)} more
        </button>
      )}
    </>
  );
}
