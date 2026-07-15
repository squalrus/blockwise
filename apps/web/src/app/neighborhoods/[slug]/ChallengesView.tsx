"use client";

import { useEffect, useState } from "react";
import type { ChallengeProgress } from "@blockwise/types";
import { clientApiUrl } from "@/lib/clientApi";
import { getOrCreateDeviceId } from "@/lib/deviceId";
import { BadgeIcon } from "../../BadgeIcon";
import { ProgressBar } from "../../ProgressBar";

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

  if (status.state === "loading") return null;
  if (status.state === "error") {
    return <p className="text-sm text-muted">Failed to load challenges.</p>;
  }
  if (status.challenges.length === 0) {
    return <p className="text-sm text-muted">No challenges running right now.</p>;
  }

  // Same grouping/ordering as the account page's Challenges tab: in-progress
  // (most percent-complete first) above completed above not-yet-started --
  // unlike the account page, not-started challenges aren't excluded here,
  // since this view is browsing what's available in the neighborhood rather
  // than a personal roll-up of engaged-with challenges.
  const inProgress = status.challenges
    .filter((c) => !c.completed && c.progress_count > 0)
    .sort((a, b) => b.progress_count / b.target_count - a.progress_count / a.target_count);
  const completed = status.challenges.filter((c) => c.completed);
  const notStarted = status.challenges.filter((c) => !c.completed && c.progress_count === 0);
  const groupCount = [inProgress, completed, notStarted].filter((g) => g.length > 0).length;

  return (
    <div className="flex flex-col gap-4">
      {inProgress.length > 0 && (
        <div className="flex flex-col gap-2">
          {groupCount > 1 && <h2 className="text-xs font-extrabold text-muted">In progress</h2>}
          <ChallengeList challenges={inProgress} />
        </div>
      )}
      {completed.length > 0 && (
        <div className="flex flex-col gap-2">
          {groupCount > 1 && <h2 className="text-xs font-extrabold text-muted">Completed</h2>}
          <ChallengeList challenges={completed} />
        </div>
      )}
      {notStarted.length > 0 && (
        <div className="flex flex-col gap-2">
          {groupCount > 1 && <h2 className="text-xs font-extrabold text-muted">Not started</h2>}
          <ChallengeList challenges={notStarted} />
        </div>
      )}
    </div>
  );
}

function ChallengeList({ challenges }: { challenges: ChallengeProgress[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {challenges.map((challenge) => {
        const progress = Math.min(challenge.progress_count, challenge.target_count);
        const percent = (progress / challenge.target_count) * 100;
        return (
          <li key={challenge.id} className="rounded-2xl bg-card-alt px-4 py-4 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="font-extrabold text-foreground">🍄 {challenge.title}</span>
              <span className="text-xs font-extrabold text-brand-green">
                {challenge.completed ? "Completed ✓" : `+${challenge.points_reward} pts`}
              </span>
            </div>
            {challenge.description && (
              <p className="mt-1 text-body-text">{challenge.description}</p>
            )}
            <div className="mt-2.5">
              <ProgressBar percent={percent} />
            </div>
            <p className="mt-1.5 flex items-center gap-1 text-[11.5px] font-bold text-muted">
              <span>
                {progress} of {challenge.target_count} check-ins
                {challenge.badge ? ` · ${challenge.badge.name} badge` : ""}
              </span>
              {challenge.badge && <BadgeIcon icon={challenge.badge.icon} name={challenge.badge.name} />}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
