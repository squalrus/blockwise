"use client";

import { useEffect, useState } from "react";
import type { UserChallenge, UserChallengeProgress } from "@blockwise/types";
import { MushroomLoader } from "@blockwise/ui";
import { getAccessToken } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";
import { BadgeIcon } from "../../../BadgeIcon";
import { ProgressBar } from "../../../ProgressBar";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; challenges: UserChallenge[]; activeChallenges: UserChallengeProgress[] };

async function load(setState: (state: State) => void) {
  const token = await getAccessToken();
  const headers = { Authorization: `Bearer ${token}` };
  const [challengesRes, activeChallengesRes] = await Promise.all([
    fetch(clientApiUrl("/me/challenges"), { headers }),
    fetch(clientApiUrl("/me/challenges/active"), { headers }),
  ]);

  if (!challengesRes.ok || !activeChallengesRes.ok) {
    setState({ status: "error", message: "Failed to load your account" });
    return;
  }

  setState({
    status: "ready",
    challenges: await challengesRes.json(),
    activeChallenges: await activeChallengesRes.json(),
  });
}

export default function ChallengesPage() {
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

  if (state.challenges.length === 0 && state.activeChallenges.length === 0) {
    return (
      <p className="text-sm text-muted">
        No challenges yet -- check a neighborhood&apos;s Challenges tab to see what&apos;s active.
      </p>
    );
  }

  return (
    <section className="flex flex-col gap-2.5">
      {state.activeChallenges.length > 0 && (
        <div className="flex flex-col gap-2">
          {state.challenges.length > 0 && <h2 className="text-xs font-extrabold text-muted">In progress</h2>}
          <ul className="flex flex-col gap-2">
            {state.activeChallenges.map((challenge) => {
              const progress = Math.min(challenge.progress_count, challenge.target_count);
              const percent = (progress / challenge.target_count) * 100;
              return (
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
                    <ProgressBar percent={percent} />
                  </div>
                  <p className="mt-1.5 text-xs font-bold text-muted">
                    {challenge.neighborhood_name ?? "App-wide"} · {progress} of {challenge.target_count} · +
                    {challenge.points_reward} pts
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {state.challenges.length > 0 && (
        <div className="flex flex-col gap-2">
          {state.activeChallenges.length > 0 && (
            <h2 className="mt-2 text-xs font-extrabold text-muted">Completed</h2>
          )}
          <ul className="flex flex-col gap-2">
            {state.challenges.map((challenge) => (
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
        </div>
      )}
    </section>
  );
}
