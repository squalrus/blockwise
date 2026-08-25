"use client";

import { useState } from "react";
import type { UserChallenge } from "@blockwise/types";
import { BadgeIcon } from "../../BadgeIcon";
import { ProgressBar } from "../../ProgressBar";

const PAGE_SIZE = 10;

// Caps a public profile's full completed-challenge list at PAGE_SIZE with a
// "load more" footer, mirroring BadgesSection's own reasoning. Card markup
// mirrors /account/(tabs)/challenges' "Completed" list exactly (always
// ProgressBar at 100 -- the public profile only ever sees completed
// challenges, never the active/in-progress ones GET /me/challenges/active
// exposes for the signed-in account itself).
export function ChallengesSection({ challenges }: { challenges: UserChallenge[] }) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  if (challenges.length === 0) {
    return <p className="text-sm text-muted">No challenges completed yet.</p>;
  }

  const visible = challenges.slice(0, visibleCount);
  const remaining = challenges.length - visible.length;

  return (
    <>
      <ul className="flex flex-col gap-2">
        {visible.map((challenge) => (
          <li key={challenge.id} className="rounded-2xl bg-card-alt px-4 py-3.5 text-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="font-extrabold text-foreground">{challenge.title}</span>
                {challenge.description && <p className="mt-1 text-body-text">{challenge.description}</p>}
              </div>
              {challenge.badge && (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-foreground bg-brand-purple text-lg">
                  <BadgeIcon icon={challenge.badge.icon} name={challenge.badge.name} />
                </span>
              )}
            </div>
            <div className="mt-2.5">
              <ProgressBar percent={100} />
            </div>
            <p className="mt-1.5 text-xs font-bold text-muted">
              {challenge.neighborhood_name ?? "App-wide"} · +{challenge.points_reward} pts · Completed{" "}
              {new Date(challenge.completed_at).toLocaleString()}
            </p>
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
