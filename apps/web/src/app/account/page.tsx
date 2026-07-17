"use client";

import { useEffect, useState } from "react";
import type {
  AppUser,
  Badge,
  CheckinHistoryItem,
  ConnectionSummary,
  FavoriteVenueSummary,
  NeighborhoodMembership,
  UserBadge,
  UserChallenge,
  UserChallengeProgress,
  UserPointsSummary,
} from "@blockwise/types";
import { MushroomLoader, MushroomLogo } from "@blockwise/ui";
import { getAccessToken, getCurrentUser } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";
import { BadgeIcon } from "../BadgeIcon";
import { CheckinTimeline } from "../CheckinTimeline";
import { NeighborsSection } from "./NeighborsSection";
import { PlaceListItem } from "../PlaceListItem";
import { ProfileSummaryCard } from "./ProfileSummaryCard";
import { ProgressBar } from "../ProgressBar";
import { SignInPrompt } from "../SignInPrompt";
import { TabNav } from "../TabNav";

type AccountTab = "spores" | "favorites" | "checkins" | "badges" | "challenges" | "neighbors";

const ACCOUNT_TABS: { key: AccountTab; label: string }[] = [
  { key: "spores", label: "Spore Feed" },
  { key: "favorites", label: "Favorites" },
  { key: "checkins", label: "Check-ins" },
  { key: "badges", label: "Badges" },
  { key: "challenges", label: "Challenges" },
  { key: "neighbors", label: "Neighbors" },
];

type State =
  | { status: "loading" }
  | { status: "signed_out" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      user: AppUser;
      favorites: FavoriteVenueSummary[];
      checkins: CheckinHistoryItem[];
      pointsSummary: UserPointsSummary;
      badges: UserBadge[];
      // BACKLOG.md Ref 61: every badge that exists, cross-referenced against
      // `badges` (earned) to render locked placeholders too.
      badgeCatalog: Badge[];
      challenges: UserChallenge[];
      activeChallenges: UserChallengeProgress[];
      // BACKLOG.md Ref 14/33 "Connect with other users": every connection
      // involving this account, pending or accepted, in either direction.
      connections: ConnectionSummary[];
      // Gates the "join a neighborhood" prompt below -- empty for a brand
      // new account, which otherwise has nothing else on this page pointing
      // it at /neighborhoods.
      neighborhoods: NeighborhoodMembership[];
    };

// Activity/action hub (BACKLOG.md "My account page"): identity from GET
// /auth/me, favorites from GET /me/favorites, check-in history from GET
// /me/checkins. Wishlist and coupons are placeholders -- neither has shipped
// yet (separate backlog items), so those sections show a "coming soon" note
// instead of real data. Profile editing and neighborhood-membership
// management live at /account/settings (BACKLOG.md Ref 48).
async function loadAccount(setState: (state: State) => void) {
  const user: AppUser | null = await getCurrentUser();
  if (!user) {
    setState({ status: "signed_out" });
    return;
  }

  const token = await getAccessToken();
  const headers = { Authorization: `Bearer ${token}` };
  const [
    favoritesRes,
    checkinsRes,
    pointsRes,
    badgesRes,
    catalogRes,
    challengesRes,
    activeChallengesRes,
    connectionsRes,
    neighborhoodsRes,
  ] = await Promise.all([
    fetch(clientApiUrl("/me/favorites"), { headers }),
    fetch(clientApiUrl("/me/checkins"), { headers }),
    fetch(clientApiUrl("/me/points"), { headers }),
    fetch(clientApiUrl("/me/badges"), { headers }),
    fetch(clientApiUrl("/badges")),
    fetch(clientApiUrl("/me/challenges"), { headers }),
    fetch(clientApiUrl("/me/challenges/active"), { headers }),
    fetch(clientApiUrl("/me/connections"), { headers }),
    fetch(clientApiUrl("/me/neighborhoods"), { headers }),
  ]);
  if (
    !favoritesRes.ok ||
    !checkinsRes.ok ||
    !pointsRes.ok ||
    !badgesRes.ok ||
    !catalogRes.ok ||
    !challengesRes.ok ||
    !activeChallengesRes.ok ||
    !connectionsRes.ok ||
    !neighborhoodsRes.ok
  ) {
    setState({ status: "error", message: "Failed to load your account" });
    return;
  }

  setState({
    status: "ready",
    user,
    favorites: await favoritesRes.json(),
    checkins: await checkinsRes.json(),
    pointsSummary: await pointsRes.json(),
    badges: await badgesRes.json(),
    badgeCatalog: await catalogRes.json(),
    challenges: await challengesRes.json(),
    activeChallenges: await activeChallengesRes.json(),
    connections: await connectionsRes.json(),
    neighborhoods: await neighborhoodsRes.json(),
  });
}

export default function AccountPage() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [activeTab, setActiveTab] = useState<AccountTab>("spores");

  useEffect(() => {
    loadAccount(setState);
  }, []);

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
            favoriteCount={state.favorites.length}
            checkinCount={state.checkins.length}
            pointsSummary={state.pointsSummary}
            badgeCount={state.badges.length}
            challengeCount={state.challenges.length}
            neighborCount={state.connections.filter((c) => c.status === "accepted").length}
            neighborMushrooms={state.connections
              .filter((c) => c.status === "accepted")
              .map((c) => c.user.mushroom_snapshot)
              .filter((snapshot) => snapshot !== null)}
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

          <TabNav
            items={ACCOUNT_TABS}
            activeKey={activeTab}
            onSelect={(key) => setActiveTab(key as AccountTab)}
          />

          {activeTab === "spores" && (
            // Stub (BACKLOG.md): a future feed of neighbor/neighborhood
            // activity -- check-ins, favorites, badge unlocks -- once the
            // underlying data's shaped. Default tab since it's meant to be
            // the first thing you see landing on your account.
            <section className="flex flex-col gap-2.5">
              <p className="text-sm text-muted">Coming soon -- a feed of what your neighbors are up to.</p>
            </section>
          )}

          {activeTab === "badges" && (
            <section className="flex flex-col gap-2.5">
              {(() => {
                const earnedIds = new Set(state.badges.map((b) => b.badge.id));
                const locked = state.badgeCatalog.filter((b) => !earnedIds.has(b.id));
                if (state.badges.length === 0 && locked.length === 0) {
                  return (
                    <p className="text-sm text-muted">
                      No badges yet -- complete a neighborhood challenge to earn one.
                    </p>
                  );
                }
                return (
                  <ul className="flex flex-col gap-2">
                    {state.badges.map((userBadge) => (
                      <li
                        key={userBadge.badge.id}
                        className="flex items-center gap-3 rounded-2xl bg-card-alt px-4 py-3.5"
                      >
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
                      <li
                        key={badge.id}
                        className="flex items-center gap-3 rounded-2xl bg-card-alt px-4 py-3.5 opacity-40"
                      >
                        <span className="flex h-13 w-13 shrink-0 items-center justify-center rounded-full border-[3px] border-dashed border-foreground bg-card text-2xl grayscale">
                          <BadgeIcon icon={badge.icon} name={badge.name} />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-extrabold text-foreground">{badge.name}</p>
                          {badge.description && (
                            <p className="mt-0.5 text-xs text-body-text">{badge.description}</p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                );
              })()}
            </section>
          )}

          {activeTab === "challenges" && (
            <section className="flex flex-col gap-2.5">
              {state.challenges.length === 0 && state.activeChallenges.length === 0 ? (
                <p className="text-sm text-muted">
                  No challenges yet -- check a neighborhood&apos;s Challenges tab to see what&apos;s active.
                </p>
              ) : (
                <>
                  {state.activeChallenges.length > 0 && (
                    <div className="flex flex-col gap-2">
                      {state.challenges.length > 0 && (
                        <h2 className="text-xs font-extrabold text-muted">In progress</h2>
                      )}
                      <ul className="flex flex-col gap-2">
                        {state.activeChallenges.map((challenge) => {
                          const progress = Math.min(challenge.progress_count, challenge.target_count);
                          const percent = (progress / challenge.target_count) * 100;
                          return (
                            <li key={challenge.id} className="rounded-2xl bg-card-alt px-4 py-3.5 text-sm">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <span className="font-extrabold text-foreground">{challenge.title}</span>
                                  {challenge.description && (
                                    <p className="mt-1 text-body-text">{challenge.description}</p>
                                  )}
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
                                {challenge.neighborhood_name} · {progress} of {challenge.target_count} · +
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
                                {challenge.description && (
                                  <p className="mt-1 text-body-text">{challenge.description}</p>
                                )}
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
                              {challenge.neighborhood_name} · +{challenge.points_reward} pts · Completed{" "}
                              {new Date(challenge.completed_at).toLocaleString()}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </section>
          )}

          {activeTab === "neighbors" && (
            <NeighborsSection connections={state.connections} onChange={() => loadAccount(setState)} />
          )}

          {activeTab === "favorites" && (
            <section className="flex flex-col gap-2.5">
              {state.favorites.length === 0 ? (
                <p className="text-sm text-muted">
                  No favorites yet -- tap the favorite button on a venue page to save it here.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {state.favorites.map((venue) => (
                    <li key={venue.venue_id}>
                      <PlaceListItem
                        href={`/location/${venue.venue_id}`}
                        id={venue.venue_id}
                        name={venue.name}
                        subtitle={venue.address}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {activeTab === "checkins" && (
            <section className="flex flex-col gap-2.5">
              <CheckinTimeline
                checkins={state.checkins}
                emptyMessage="No check-ins yet -- check in from a venue page when you're there."
              />
            </section>
          )}

          <div className="flex gap-2.5">
            <section className="flex-1 rounded-2xl bg-card-alt px-3.5 py-3.5 text-center">
              <h2 className="text-xs font-extrabold text-foreground">Wishlist</h2>
              <p className="mt-1 text-[11px] font-bold text-muted">Coming soon</p>
            </section>
            <section className="flex-1 rounded-2xl bg-card-alt px-3.5 py-3.5 text-center">
              <h2 className="text-xs font-extrabold text-foreground">Coupons</h2>
              <p className="mt-1 text-[11px] font-bold text-muted">Coming soon</p>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
