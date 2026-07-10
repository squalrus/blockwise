"use client";

import { useEffect, useState } from "react";
import type {
  AppUser,
  CheckinHistoryItem,
  FavoriteVenueSummary,
  NeighborhoodMembership,
  UserBadge,
} from "@blockwise/types";
import { getAccessToken, getCurrentUser } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";
import { BadgeIcon } from "../BadgeIcon";
import { CheckinTimeline } from "../CheckinTimeline";
import { PlaceListItem } from "../PlaceListItem";
import { NearestVenues } from "./NearestVenues";
import { ProfileSummaryCard } from "./ProfileSummaryCard";

type State =
  | { status: "loading" }
  | { status: "signed_out" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      user: AppUser;
      favorites: FavoriteVenueSummary[];
      checkins: CheckinHistoryItem[];
      neighborhoods: NeighborhoodMembership[];
      points: number;
      badges: UserBadge[];
    };

// Activity/action hub (BACKLOG.md "My account page"): identity from GET
// /auth/me, favorites from GET /me/favorites, check-in history from GET
// /me/checkins. Wishlist and coupons are placeholders -- neither has shipped
// yet (separate backlog items), so those sections show a "coming soon" note
// instead of real data. Profile editing and neighborhood-membership
// management live at /account/settings (BACKLOG.md Ref 48).
export default function AccountPage() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const user: AppUser | null = await getCurrentUser();
      if (cancelled) return;
      if (!user) {
        setState({ status: "signed_out" });
        return;
      }

      const token = await getAccessToken();
      const headers = { Authorization: `Bearer ${token}` };
      const [favoritesRes, checkinsRes, neighborhoodsRes, pointsRes, badgesRes] = await Promise.all([
        fetch(clientApiUrl("/me/favorites"), { headers }),
        fetch(clientApiUrl("/me/checkins"), { headers }),
        fetch(clientApiUrl("/me/neighborhoods"), { headers }),
        fetch(clientApiUrl("/me/points"), { headers }),
        fetch(clientApiUrl("/me/badges"), { headers }),
      ]);
      if (cancelled) return;
      if (!favoritesRes.ok || !checkinsRes.ok || !neighborhoodsRes.ok || !pointsRes.ok || !badgesRes.ok) {
        setState({ status: "error", message: "Failed to load your account" });
        return;
      }

      const pointsBody = await pointsRes.json();
      setState({
        status: "ready",
        user,
        favorites: await favoritesRes.json(),
        checkins: await checkinsRes.json(),
        neighborhoods: await neighborhoodsRes.json(),
        points: pointsBody.points,
        badges: await badgesRes.json(),
      });
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 font-sans sm:p-16">
      <div className="flex items-center gap-3">
        <h1 className="font-heading text-xl font-extrabold text-foreground">My account</h1>
        {state.status === "ready" && (
          <a href="/account/settings" className="text-sm font-bold text-brand-purple hover:text-brand-orange">
            Settings
          </a>
        )}
      </div>

      {state.status === "loading" && <p className="text-sm text-muted">Loading…</p>}

      {state.status === "signed_out" && (
        <p className="text-sm text-muted">
          <a href="/login" className="font-bold text-brand-purple hover:text-brand-orange">
            Log in
          </a>{" "}
          to see your account details, favorites, and check-in history.
        </p>
      )}

      {state.status === "error" && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>
      )}

      {state.status === "ready" && (
        <>
          <ProfileSummaryCard
            user={state.user}
            favoriteCount={state.favorites.length}
            checkinCount={state.checkins.length}
            points={state.points}
          />

          <section className="flex flex-col gap-2.5">
            <h2 className="text-xs font-extrabold tracking-wide text-muted uppercase">Check in nearby</h2>
            <NearestVenues
              homeNeighborhoodId={state.neighborhoods.find((n) => n.is_primary)?.neighborhood_id ?? null}
            />
          </section>

          <section id="badges" className="flex flex-col gap-2.5 scroll-mt-16">
            <h2 className="text-xs font-extrabold tracking-wide text-muted uppercase">Badges</h2>
            {state.badges.length === 0 ? (
              <p className="text-sm text-muted">
                No badges yet -- complete a neighborhood challenge to earn one.
              </p>
            ) : (
              <ul className="flex flex-wrap gap-4">
                {state.badges.map((userBadge) => (
                  <li key={userBadge.badge.id} className="flex flex-col items-center gap-1.5 text-center">
                    <span className="flex h-13 w-13 items-center justify-center rounded-full border-[3px] border-nav bg-brand-amber text-2xl">
                      <BadgeIcon icon={userBadge.badge.icon} name={userBadge.badge.name} />
                    </span>
                    <span className="max-w-16 text-[10.5px] font-extrabold text-foreground">
                      {userBadge.badge.name}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section id="favorites" className="flex flex-col gap-2.5 scroll-mt-16">
            <h2 className="text-xs font-extrabold tracking-wide text-muted uppercase">Favorite venues</h2>
            {state.favorites.length === 0 ? (
              <p className="text-sm text-muted">
                No favorites yet -- tap the favorite button on a venue page to save it here.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {state.favorites.map((venue) => (
                  <li key={venue.venue_id}>
                    <PlaceListItem
                      href={`/venues/${venue.venue_id}`}
                      id={venue.venue_id}
                      name={venue.name}
                      subtitle={venue.address}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section id="checkins" className="flex flex-col gap-2.5 scroll-mt-16">
            <h2 className="text-xs font-extrabold tracking-wide text-muted uppercase">Recent check-ins</h2>
            <CheckinTimeline
              checkins={state.checkins}
              emptyMessage="No check-ins yet -- check in from a venue page when you're there."
            />
          </section>

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
