"use client";

import { useEffect, useState } from "react";
import type { AppUser, ClaimedVenueSummary } from "@blockwise/types";
import { getAccessToken, getCurrentUser, promoteToBusiness } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";

type State =
  | { status: "loading" }
  | { status: "signed_out" }
  | { status: "wrong_account_type" }
  | { status: "ready"; venues: ClaimedVenueSummary[] }
  | { status: "error"; message: string };

// Gated by requireBusinessAccount on GET /business/venues (apps/api) --
// the concrete, testable slice of "Real user authentication"'s business
// variant. Each claimed venue links to its own per-venue dashboard
// (/business/[venueId]) for stats and announcement/event authoring.
export default function BusinessPortalPage() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [promoting, setPromoting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const user: AppUser | null = await getCurrentUser();
      if (cancelled) return;
      if (!user) {
        setState({ status: "signed_out" });
        return;
      }
      if (user.account_type !== "business") {
        setState({ status: "wrong_account_type" });
        return;
      }

      const token = await getAccessToken();
      const res = await fetch(clientApiUrl("/business/venues"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (cancelled) return;
      if (!res.ok) {
        setState({ status: "error", message: "Failed to load your claimed venues" });
        return;
      }
      setState({ status: "ready", venues: await res.json() });
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handlePromote() {
    setPromoting(true);
    try {
      await promoteToBusiness();
      window.location.reload();
    } catch (err) {
      setPromoting(false);
      setState({ status: "error", message: err instanceof Error ? err.message : "Failed to upgrade" });
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4 font-sans sm:p-16">
      <h1 className="font-heading text-xl font-extrabold text-foreground">Business portal</h1>

      {state.status === "loading" && <p className="text-sm text-muted">Loading…</p>}

      {state.status === "signed_out" && (
        <p className="text-sm text-muted">
          <a href="/login" className="font-bold text-brand-purple hover:text-brand-orange">
            Log in
          </a>{" "}
          with a business account to manage your claimed venues.
        </p>
      )}

      {state.status === "wrong_account_type" && (
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm text-muted">
            This account isn&apos;t a business account yet. Upgrade it to claim and manage a venue --
            your check-ins and everything else about the account stay the same.
          </p>
          <button
            type="button"
            onClick={handlePromote}
            disabled={promoting}
            className="rounded-md bg-brand-purple px-4 py-2 text-sm font-bold text-on-accent disabled:opacity-50"
          >
            {promoting ? "Upgrading…" : "Become a business owner"}
          </button>
        </div>
      )}

      {state.status === "error" && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>
      )}

      {state.status === "ready" && state.venues.length === 0 && (
        <p className="text-sm text-muted">
          No approved claims yet. Submit a claim from a venue page, signed in as this business
          account, and it&apos;ll show up here once an admin approves it.
        </p>
      )}

      {state.status === "ready" && state.venues.length > 0 && (
        <ul className="flex flex-col gap-2">
          {state.venues.map((venue) => (
            <li key={venue.venue_id} className="rounded-2xl bg-card-alt px-4 py-3 text-sm">
              <a
                href={`/business/${venue.venue_id}`}
                className="font-extrabold text-foreground hover:text-brand-purple"
              >
                {venue.name}
              </a>
              <p className="text-muted">{venue.address}</p>
              <a href={`/location/${venue.venue_id}`} className="text-xs font-bold text-brand-purple hover:text-brand-orange">
                View public page
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
