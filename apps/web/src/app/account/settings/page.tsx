"use client";

import { useEffect, useState } from "react";
import type { AppUser, NeighborhoodMembership } from "@blockwise/types";
import { getAccessToken, getCurrentUser } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";
import { MushroomSection } from "../MushroomSection";
import { ProfileForm } from "../ProfileForm";

type State =
  | { status: "loading" }
  | { status: "signed_out" }
  | { status: "error"; message: string }
  | { status: "ready"; user: AppUser; neighborhoods: NeighborhoodMembership[] };

// BACKLOG.md Ref 48: relocates profile editing, account details, and
// neighborhood-membership management off /account (an activity/action hub as
// of v0.23.0) onto their own settings surface.
export default function AccountSettingsPage() {
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
      const res = await fetch(clientApiUrl("/me/neighborhoods"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (cancelled) return;
      if (!res.ok) {
        setState({ status: "error", message: "Failed to load your account" });
        return;
      }

      setState({ status: "ready", user, neighborhoods: await res.json() });
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
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 font-sans sm:p-16">
      <div className="flex items-center gap-3">
        <h1 className="font-heading text-xl font-extrabold text-foreground">Settings</h1>
        <a href="/account" className="text-sm font-bold text-brand-purple hover:text-brand-orange">
          Back to account
        </a>
      </div>

      {state.status === "loading" && <p className="text-sm text-muted">Loading…</p>}

      {state.status === "signed_out" && (
        <p className="text-sm text-muted">
          <a href="/login" className="font-bold text-brand-purple hover:text-brand-orange">
            Log in
          </a>{" "}
          to manage your account settings.
        </p>
      )}

      {state.status === "error" && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>
      )}

      {state.status === "ready" && (
        <>
          <section className="flex flex-col gap-2.5">
            <h2 className="text-xs font-extrabold tracking-wide text-muted uppercase">Account details</h2>
            <div className="rounded-xl bg-card-alt px-4 py-3 text-sm">
              <p className="font-extrabold text-foreground">
                {state.user.email ?? state.user.phone ?? "Anonymous account"}
              </p>
              <p className="text-muted">
                {state.user.account_type === "business" ? "Business account" : "Consumer account"}
                {state.user.is_neighborhood_admin ? " · Neighborhood admin" : ""}
              </p>
              <p className="text-muted">
                Member since {new Date(state.user.created_at).toLocaleDateString()}
              </p>
            </div>
          </section>

          <section className="flex flex-col gap-2.5">
            <h2 className="text-xs font-extrabold tracking-wide text-muted uppercase">Profile</h2>
            <ProfileForm user={state.user} onSaved={handleProfileSaved} />
          </section>

          <section className="flex flex-col gap-2.5">
            <h2 className="text-xs font-extrabold tracking-wide text-muted uppercase">Mushroom avatar</h2>
            <MushroomSection user={state.user} onSaved={handleProfileSaved} />
          </section>

          <section className="flex flex-col gap-2.5">
            <h2 className="text-xs font-extrabold tracking-wide text-muted uppercase">Neighborhoods</h2>
            {state.neighborhoods.length === 0 ? (
              <p className="text-sm text-muted">
                No neighborhoods joined yet -- join one from the{" "}
                <a href="/" className="font-bold text-brand-purple hover:text-brand-orange">
                  home page
                </a>
                .
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {state.neighborhoods.map((n) => (
                  <li
                    key={n.neighborhood_id}
                    className="flex items-center justify-between gap-4 rounded-xl bg-card-alt px-4 py-3 text-sm"
                  >
                    <div>
                      <a
                        href={`/neighborhoods/${n.slug}`}
                        className="font-extrabold text-foreground hover:text-brand-purple"
                      >
                        {n.name}
                      </a>
                      <p className="text-muted">
                        {n.city}, {n.state}
                        {n.is_primary ? " · Home" : ""}
                      </p>
                    </div>
                    {!n.is_primary && (
                      <button
                        onClick={() => setHome(n.neighborhood_id)}
                        className="shrink-0 rounded-md border border-border px-3 py-1 text-xs font-bold text-foreground hover:bg-card"
                      >
                        Set as home
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
