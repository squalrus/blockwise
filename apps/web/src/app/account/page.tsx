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
import { ProfileForm } from "./ProfileForm";

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
      const [favoritesRes, checkinsRes, neighborhoodsRes] = await Promise.all([
        fetch(clientApiUrl("/me/favorites"), { headers }),
        fetch(clientApiUrl("/me/checkins"), { headers }),
        fetch(clientApiUrl("/me/neighborhoods"), { headers }),
      ]);
      if (cancelled) return;
      if (!favoritesRes.ok || !checkinsRes.ok || !neighborhoodsRes.ok) {
        setState({ status: "error", message: "Failed to load your account" });
        return;
      }

      setState({
        status: "ready",
        user,
        favorites: await favoritesRes.json(),
        checkins: await checkinsRes.json(),
        neighborhoods: await neighborhoodsRes.json(),
      });
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleProfileSaved(user: AppUser) {
    if (state.status !== "ready") return;
    setState({ ...state, user });
  }

  async function setHome(neighborhoodId: string) {
    if (state.status !== "ready") return;
    const token = await getAccessToken();
    const res = await fetch(clientApiUrl(`/neighborhoods/${neighborhoodId}/home`), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;

    setState({
      ...state,
      neighborhoods: state.neighborhoods.map((n) => ({
        ...n,
        is_primary: n.neighborhood_id === neighborhoodId,
      })),
    });
  }

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
            <h2 className="text-sm font-medium text-black dark:text-zinc-50">Profile</h2>
            <ProfileForm user={state.user} onSaved={handleProfileSaved} />
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-medium text-black dark:text-zinc-50">Neighborhoods</h2>
            {state.neighborhoods.length === 0 ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                No neighborhoods joined yet -- join one from the{" "}
                <a href="/" className="underline">
                  home page
                </a>
                .
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {state.neighborhoods.map((n) => (
                  <li
                    key={n.neighborhood_id}
                    className="flex items-center justify-between gap-4 rounded-lg border border-black/[.08] px-4 py-3 text-sm dark:border-white/[.145]"
                  >
                    <div>
                      <a
                        href={`/neighborhoods/${n.slug}`}
                        className="font-medium text-black hover:underline dark:text-zinc-50"
                      >
                        {n.name}
                      </a>
                      <p className="text-zinc-600 dark:text-zinc-400">
                        {n.city}, {n.state}
                        {n.is_primary ? " · Home" : ""}
                      </p>
                    </div>
                    {!n.is_primary && (
                      <button
                        onClick={() => setHome(n.neighborhood_id)}
                        className="shrink-0 rounded-md border border-black/[.08] px-3 py-1 text-xs font-medium text-black dark:border-white/[.145] dark:text-zinc-50"
                      >
                        Set as home
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
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
