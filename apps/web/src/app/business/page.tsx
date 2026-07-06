"use client";

import { useEffect, useState } from "react";
import type { AppUser, ClaimedVenueSummary } from "@blockwise/types";
import { getAccessToken, getCurrentUser } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";

type State =
  | { status: "loading" }
  | { status: "signed_out" }
  | { status: "wrong_account_type" }
  | { status: "ready"; venues: ClaimedVenueSummary[] }
  | { status: "error"; message: string };

// Gated by requireBusinessAccount on GET /business/venues (apps/api) --
// the concrete, testable slice of "Real user authentication"'s business
// variant. The actual authoring tools (posting announcements, etc.) are a
// separate backlog item that depends on this login; this page just proves
// the account_type gate works end-to-end via the one business action that
// already exists: viewing venues this account has an approved claim on.
export default function BusinessPortalPage() {
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

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-16 font-sans">
      <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Business portal</h1>

      {state.status === "loading" && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading…</p>
      )}

      {state.status === "signed_out" && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          <a href="/login" className="underline">
            Log in
          </a>{" "}
          with a business account to manage your claimed venues.
        </p>
      )}

      {state.status === "wrong_account_type" && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          This account isn&apos;t a business account.{" "}
          <a href="/signup" className="underline">
            Sign up
          </a>{" "}
          for one to claim and manage a venue.
        </p>
      )}

      {state.status === "error" && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>
      )}

      {state.status === "ready" && state.venues.length === 0 && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No approved claims yet. Submit a claim from a venue page, signed in as this business
          account, and it&apos;ll show up here once an admin approves it.
        </p>
      )}

      {state.status === "ready" && state.venues.length > 0 && (
        <ul className="flex flex-col gap-2">
          {state.venues.map((venue) => (
            <li
              key={venue.venue_id}
              className="rounded-lg border border-black/[.08] px-4 py-3 text-sm dark:border-white/[.145]"
            >
              <a href={`/venues/${venue.venue_id}`} className="font-medium text-black hover:underline dark:text-zinc-50">
                {venue.name}
              </a>
              <p className="text-zinc-600 dark:text-zinc-400">{venue.address}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
