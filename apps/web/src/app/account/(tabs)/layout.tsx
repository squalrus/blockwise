"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  AppUser,
  CheckinHistoryItem,
  ConnectionSummary,
  MushroomCollectionEntry,
  NeighborhoodMembership,
  UserBadge,
  UserChallenge,
  UserPointsSummary,
} from "@blockwise/types";
import { MushroomLoader, MushroomLogo, resolveMushroomConfig } from "@blockwise/ui";
import type { MushroomShape, SpotShape } from "@blockwise/ui";
import { getAccessToken, getCurrentUser } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";
import { SignInPrompt } from "../../SignInPrompt";
import { AccountRefreshProvider } from "../AccountContext";
import { AccountTabs } from "../AccountTabs";
import { ProfileSummaryCard } from "../ProfileSummaryCard";

type State =
  | { status: "loading" }
  | { status: "signed_out" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      user: AppUser;
      collection: MushroomCollectionEntry[];
      checkins: CheckinHistoryItem[];
      pointsSummary: UserPointsSummary;
      badges: UserBadge[];
      challenges: UserChallenge[];
      connections: ConnectionSummary[];
      neighborhoods: NeighborhoodMembership[];
    };

// Shared chrome for every /account/* tab (profile summary card, "join a
// neighborhood" prompt, route-driven tab bar) -- mirrors
// /neighborhoods/[slug]/layout.tsx's split of shared header + per-tab
// page.tsx content. Each tab fetches its own list data; this layout only
// fetches what the summary card needs.
async function loadSummary(setState: (state: State) => void) {
  const user: AppUser | null = await getCurrentUser();
  if (!user) {
    setState({ status: "signed_out" });
    return;
  }

  const token = await getAccessToken();
  const headers = { Authorization: `Bearer ${token}` };
  const [collectionRes, checkinsRes, pointsRes, badgesRes, challengesRes, connectionsRes, neighborhoodsRes] =
    await Promise.all([
      fetch(clientApiUrl("/me/collection"), { headers }),
      fetch(clientApiUrl("/me/checkins"), { headers }),
      fetch(clientApiUrl("/me/points"), { headers }),
      fetch(clientApiUrl("/me/badges"), { headers }),
      fetch(clientApiUrl("/me/challenges"), { headers }),
      fetch(clientApiUrl("/me/connections"), { headers }),
      fetch(clientApiUrl("/me/neighborhoods"), { headers }),
    ]);

  if (
    !collectionRes.ok ||
    !checkinsRes.ok ||
    !pointsRes.ok ||
    !badgesRes.ok ||
    !challengesRes.ok ||
    !connectionsRes.ok ||
    !neighborhoodsRes.ok
  ) {
    setState({ status: "error", message: "Failed to load your account" });
    return;
  }

  setState({
    status: "ready",
    user,
    collection: await collectionRes.json(),
    checkins: await checkinsRes.json(),
    pointsSummary: await pointsRes.json(),
    badges: await badgesRes.json(),
    challenges: await challengesRes.json(),
    connections: await connectionsRes.json(),
    neighborhoods: await neighborhoodsRes.json(),
  });
}

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>({ status: "loading" });

  const refresh = useCallback(() => {
    loadSummary(setState);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 font-sans sm:p-16">
      <div className="flex items-center gap-3">
        <h1 className="font-heading text-xl font-extrabold text-foreground">My account</h1>
      </div>

      {state.status === "loading" && (
        <div className="flex min-h-[50vh] items-center justify-center">
          <MushroomLoader size={72} />
        </div>
      )}

      {state.status === "signed_out" && (
        <SignInPrompt message="to see your account details, favorites, and check-in history." />
      )}

      {state.status === "error" && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>
      )}

      {state.status === "ready" && (
        <>
          {state.neighborhoods.length === 0 && (
            <section className="flex flex-col items-start gap-2.5 rounded-3xl bg-nav p-5.5 text-nav-foreground">
              <div className="flex items-center gap-2.5">
                <MushroomLogo size={22} capColor="var(--brand-orange)" stemClassName="text-nav-foreground" />
                <h2 className="font-heading text-[17px] font-extrabold">Find your neighborhood</h2>
              </div>
              <p className="text-[13px] leading-relaxed text-nav-muted">
                You haven&apos;t joined a neighborhood yet -- join one to check in at nearby spots, earn points,
                and connect with the neighbors around you.
              </p>
              <a
                href="/neighborhoods"
                className="mt-1 rounded-full bg-brand-orange px-4 py-2 text-sm font-extrabold text-on-accent"
              >
                Browse neighborhoods
              </a>
            </section>
          )}

          <ProfileSummaryCard
            user={state.user}
            collectionCount={state.collection.length}
            checkinCount={state.checkins.length}
            pointsSummary={state.pointsSummary}
            badgeCount={state.badges.length}
            challengeCount={state.challenges.length}
            neighborCount={state.connections.filter((c) => c.status === "accepted").length}
            neighborMushrooms={state.connections
              .filter((c) => c.status === "accepted")
              .map((c) =>
                resolveMushroomConfig(
                  c.user.id,
                  c.user.mushroom_customization
                    ? {
                        ...c.user.mushroom_customization,
                        shape: (c.user.mushroom_customization.shape as MushroomShape | undefined) ?? "button",
                        spotShape: c.user.mushroom_customization.spotShape as SpotShape,
                      }
                    : null
                )
              )}
            action={
              state.user.visibility === "public" && state.user.username ? (
                <a
                  href={`/profile/${state.user.username}`}
                  className="shrink-0 rounded-full border-2 border-foreground px-3.5 py-2 text-xs font-extrabold whitespace-nowrap text-foreground hover:bg-card"
                >
                  View public
                </a>
              ) : undefined
            }
          />

          <AccountTabs
            unrevealedCollectionCount={state.collection.filter((entry) => !entry.revealed).length}
          />

          <AccountRefreshProvider value={refresh}>{children}</AccountRefreshProvider>
        </>
      )}
    </div>
  );
}
