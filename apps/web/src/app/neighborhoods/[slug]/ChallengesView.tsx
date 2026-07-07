"use client";

import { useEffect, useState } from "react";
import type { ChallengeProgress } from "@blockwise/types";
import { clientApiUrl } from "@/lib/clientApi";
import { getOrCreateDeviceId } from "@/lib/deviceId";

type Status =
  | { state: "loading" }
  | { state: "idle"; challenges: ChallengeProgress[] }
  | { state: "error" };

// BACKLOG.md Ref 6: template-driven challenges with live per-user progress.
// Client-rendered (rather than fetched server-side like Venues/Events) since
// progress depends on the anonymous device id, which only exists client-side.
export function ChallengesView({ neighborhoodSlug }: { neighborhoodSlug: string }) {
  const [status, setStatus] = useState<Status>({ state: "loading" });

  useEffect(() => {
    let cancelled = false;
    const deviceId = getOrCreateDeviceId();

    fetch(
      clientApiUrl(`/neighborhoods/${neighborhoodSlug}/challenges?anonymous_device_id=${deviceId}`)
    )
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load challenges");
        return res.json();
      })
      .then((body) => {
        if (!cancelled) setStatus({ state: "idle", challenges: body as ChallengeProgress[] });
      })
      .catch(() => {
        if (!cancelled) setStatus({ state: "error" });
      });

    return () => {
      cancelled = true;
    };
  }, [neighborhoodSlug]);

  if (status.state === "loading" || status.state === "error") return null;
  if (status.challenges.length === 0) return null;

  return (
    <div>
      <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Challenges</h2>
      <ul className="mt-2 flex flex-col gap-2">
        {status.challenges.map((challenge) => (
          <li
            key={challenge.id}
            className="rounded-lg border border-black/[.08] px-4 py-3 text-sm dark:border-white/[.145]"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-black dark:text-zinc-50">{challenge.title}</span>
              {challenge.completed && (
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  Completed ✓
                </span>
              )}
            </div>
            {challenge.description && (
              <p className="mt-1 text-zinc-600 dark:text-zinc-400">{challenge.description}</p>
            )}
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
              {Math.min(challenge.progress_count, challenge.target_count)}/{challenge.target_count} ·{" "}
              {challenge.points_reward}pt bonus
              {challenge.badge ? ` · ${challenge.badge.name} badge` : ""}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
