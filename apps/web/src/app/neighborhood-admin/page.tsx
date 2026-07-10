"use client";

import { useEffect, useState } from "react";
import type { AppUser, NeighborhoodAdminSummary } from "@blockwise/types";
import { getAccessToken, getCurrentUser } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";

type State =
  | { status: "loading" }
  | { status: "signed_out" }
  | { status: "not_admin" }
  | { status: "ready"; neighborhoods: NeighborhoodAdminSummary[] }
  | { status: "error"; message: string };

// Neighborhood profile pages (BACKLOG.md): landing page for a signed-in
// neighborhood admin, listing the neighborhood(s) they administer -- mirrors
// the business portal's shape (business/page.tsx), just scoped to
// Neighborhood instead of claimed Venues. Each neighborhood links to its own
// authoring dashboard (/neighborhood-admin/[neighborhoodId]).
export default function NeighborhoodAdminPortalPage() {
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
      if (!user.is_neighborhood_admin) {
        setState({ status: "not_admin" });
        return;
      }

      const token = await getAccessToken();
      const res = await fetch(clientApiUrl("/neighborhood-admin/neighborhoods"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (cancelled) return;
      if (!res.ok) {
        setState({ status: "error", message: "Failed to load your administered neighborhoods" });
        return;
      }
      setState({ status: "ready", neighborhoods: await res.json() });
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4 font-sans sm:p-16">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl font-extrabold text-foreground">Neighborhood admin</h1>
        {state.status === "ready" && (
          <a
            href="/neighborhood-admin/new"
            className="rounded-full bg-brand-purple px-3.5 py-1.5 text-sm font-bold text-on-accent"
          >
            New neighborhood
          </a>
        )}
      </div>

      {state.status === "loading" && <p className="text-sm text-muted">Loading…</p>}

      {state.status === "signed_out" && (
        <p className="text-sm text-muted">
          <a href="/login" className="font-bold text-brand-purple hover:text-brand-orange">
            Log in
          </a>{" "}
          with a neighborhood admin account to manage a neighborhood's profile.
        </p>
      )}

      {state.status === "not_admin" && (
        <p className="text-sm text-muted">This account isn&apos;t a neighborhood admin for any neighborhood.</p>
      )}

      {state.status === "error" && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>
      )}

      {state.status === "ready" && state.neighborhoods.length === 0 && (
        <p className="text-sm text-muted">You aren&apos;t an admin of any neighborhood yet.</p>
      )}

      {state.status === "ready" && state.neighborhoods.length > 0 && (
        <ul className="flex flex-col gap-2">
          {state.neighborhoods.map((neighborhood) => (
            <li key={neighborhood.neighborhood_id} className="rounded-2xl bg-card-alt px-4 py-3 text-sm">
              <a
                href={`/neighborhood-admin/${neighborhood.slug}`}
                className="font-extrabold text-foreground hover:text-brand-purple"
              >
                {neighborhood.name}
              </a>
              <a
                href={`/neighborhoods/${neighborhood.slug}`}
                className="ml-2 text-xs font-bold text-brand-purple hover:text-brand-orange"
              >
                View public page
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
