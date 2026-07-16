"use client";

import { useEffect, useState } from "react";
import type { AppUser, NeighborhoodMembership } from "@blockwise/types";
import { MushroomLoader } from "@blockwise/ui";
import { getAccessToken, getCurrentUser } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";
import { NearestVenues } from "./NearestVenues";

type State =
  | { status: "loading" }
  | { status: "signed_out" }
  | { status: "error"; message: string }
  | { status: "ready"; homeNeighborhoodId: string | null };

// Quick-access check-in hub, linked from the nav next to the hamburger menu.
// Split out of /account (BACKLOG.md "My account page") so checking in
// nearby doesn't require loading the rest of the account page first.
export default function CheckinPage() {
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
        setState({ status: "error", message: "Failed to load your check-in options" });
        return;
      }

      const neighborhoods: NeighborhoodMembership[] = await res.json();
      setState({
        status: "ready",
        homeNeighborhoodId: neighborhoods.find((n) => n.is_primary)?.neighborhood_id ?? null,
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
      <h1 className="font-heading text-xl font-extrabold text-foreground">Check in</h1>

      {state.status === "loading" && (
        <div className="flex min-h-[50vh] items-center justify-center">
          <MushroomLoader size={72} />
        </div>
      )}

      {state.status === "signed_out" && (
        <p className="text-sm text-muted">
          <a href="/login" className="font-bold text-brand-purple hover:text-brand-orange">
            Log in
          </a>{" "}
          to check in at nearby venues.
        </p>
      )}

      {state.status === "error" && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>
      )}

      {state.status === "ready" && <NearestVenues homeNeighborhoodId={state.homeNeighborhoodId} />}
    </div>
  );
}
