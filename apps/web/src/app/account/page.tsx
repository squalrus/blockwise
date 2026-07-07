"use client";

import { useEffect, useState } from "react";
import type { AppUser, CheckinHistoryItem, FavoriteVenueSummary } from "@blockwise/types";
import { getAccessToken, getCurrentUser } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";

type State =
  | { status: "loading" }
  | { status: "signed_out" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      user: AppUser;
      favorites: FavoriteVenueSummary[];
      checkins: CheckinHistoryItem[];
    };

// Aggregates the account state that's scattered across its own flows today
// (BACKLOG.md "My account page"): identity from GET /auth/me, favorites
// from GET /me/favorites, check-in history from GET /me/checkins. Wishlist
// and coupons are placeholders -- neither has shipped yet (separate backlog
// items), so those sections show a "coming soon" note instead of real data.
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
      const [favoritesRes, checkinsRes] = await Promise.all([
        fetch(clientApiUrl("/me/favorites"), { headers }),
        fetch(clientApiUrl("/me/checkins"), { headers }),
      ]);
      if (cancelled) return;
      if (!favoritesRes.ok || !checkinsRes.ok) {
        setState({ status: "error", message: "Failed to load your account" });
        return;
      }

      setState({
        status: "ready",
        user,
        favorites: await favoritesRes.json(),
        checkins: await checkinsRes.json(),
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
      <h1 className="text-xl font-semibold text-black dark:text-zinc-50">My account</h1>

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
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-medium text-black dark:text-zinc-50">Account details</h2>
            <div className="rounded-lg border border-black/[.08] px-4 py-3 text-sm dark:border-white/[.145]">
              <p className="text-black dark:text-zinc-50">{state.user.email ?? state.user.phone ?? "Anonymous account"}</p>
              <p className="text-zinc-600 dark:text-zinc-400">
                {state.user.account_type === "business" ? "Business account" : "Consumer account"}
                {state.user.is_neighborhood_admin ? " · Neighborhood admin" : ""}
              </p>
              <p className="text-zinc-600 dark:text-zinc-400">
                Member since {new Date(state.user.created_at).toLocaleDateString()}
              </p>
            </div>
          </section>

          <section className="flex flex-col gap-2">
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

          <section className="flex flex-col gap-2">
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
