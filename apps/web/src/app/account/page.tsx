"use client";

import { useEffect, useState } from "react";
import type {
  AppUser,
  CheckinHistoryItem,
  FavoriteVenueSummary,
  NeighborhoodMembership,
} from "@blockwise/types";
import { getAccessToken, getCurrentUser } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";
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
      const [favoritesRes, checkinsRes, neighborhoodsRes, pointsRes] = await Promise.all([
        fetch(clientApiUrl("/me/favorites"), { headers }),
        fetch(clientApiUrl("/me/checkins"), { headers }),
        fetch(clientApiUrl("/me/neighborhoods"), { headers }),
        fetch(clientApiUrl("/me/points"), { headers }),
      ]);
      if (cancelled) return;
      if (!favoritesRes.ok || !checkinsRes.ok || !neighborhoodsRes.ok || !pointsRes.ok) {
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
      });
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-16 font-sans">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold text-black dark:text-zinc-50">My account</h1>
        {state.status === "ready" && (
          <a href="/account/settings" className="text-sm text-zinc-600 hover:underline dark:text-zinc-400">
            Settings
          </a>
        )}
      </div>

      {state.status === "loading" && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading…</p>
      )}

      {state.status === "signed_out" && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          <a href="/login" className="underline">
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

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-medium text-black dark:text-zinc-50">Check in</h2>
            <NearestVenues
              homeNeighborhoodId={state.neighborhoods.find((n) => n.is_primary)?.neighborhood_id ?? null}
            />
          </section>

          <section id="favorites" className="flex flex-col gap-2 scroll-mt-16">
            <h2 className="text-sm font-medium text-black dark:text-zinc-50">Favorite venues</h2>
            {state.favorites.length === 0 ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                No favorites yet -- tap the favorite button on a venue page to save it here.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {state.favorites.map((venue) => (
                  <li
                    key={venue.venue_id}
                    className="rounded-lg border border-black/[.08] px-4 py-3 text-sm dark:border-white/[.145]"
                  >
                    <a
                      href={`/venues/${venue.venue_id}`}
                      className="font-medium text-black hover:underline dark:text-zinc-50"
                    >
                      {venue.name}
                    </a>
                    <p className="text-zinc-600 dark:text-zinc-400">{venue.address}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section id="checkins" className="flex flex-col gap-2 scroll-mt-16">
            <h2 className="text-sm font-medium text-black dark:text-zinc-50">Recent check-ins</h2>
            {state.checkins.length === 0 ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                No check-ins yet -- check in from a venue page when you're there.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {state.checkins.map((checkin, index) => (
                  <li
                    key={`${checkin.venue_id}-${checkin.checked_in_at}-${index}`}
                    className="rounded-lg border border-black/[.08] px-4 py-3 text-sm dark:border-white/[.145]"
                  >
                    <a
                      href={`/venues/${checkin.venue_id}`}
                      className="font-medium text-black hover:underline dark:text-zinc-50"
                    >
                      {checkin.name}
                    </a>
                    <p className="text-zinc-600 dark:text-zinc-400">
                      {new Date(checkin.checked_in_at).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-medium text-black dark:text-zinc-50">Wishlist</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Coming soon.</p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-medium text-black dark:text-zinc-50">Coupons</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Coming soon.</p>
          </section>
        </>
      )}
    </div>
  );
}
