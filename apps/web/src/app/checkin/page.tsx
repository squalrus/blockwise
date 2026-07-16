"use client";

import { useEffect, useState } from "react";
import type { AppUser, NeighborhoodMembership } from "@blockwise/types";
import { MushroomLoader } from "@blockwise/ui";
import { getAccessToken, getCurrentUser } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";
import { NearestVenues } from "./NearestVenues";
import { NeighborhoodSwitcher } from "./NeighborhoodSwitcher";

type State =
  | { status: "loading" }
  | { status: "signed_out" }
  | { status: "error"; message: string }
  | { status: "ready"; neighborhoods: NeighborhoodMembership[] };

// Quick-access check-in hub, linked from the nav next to the hamburger menu.
// Split out of /account (BACKLOG.md "My account page") so checking in
// nearby doesn't require loading the rest of the account page first.
export default function CheckinPage() {
  const [state, setState] = useState<State>({ status: "loading" });
  // Which neighborhood's venues NearestVenues shows -- defaults to the
  // user's active neighborhood (is_primary) once loaded. Switching via the
  // pill dropdown next to the heading both updates this and persists the
  // new active neighborhood server-side (setActiveNeighborhood below), same
  // endpoint /account/settings uses.
  const [selectedNeighborhoodId, setSelectedNeighborhoodId] = useState<string | null>(null);

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
      setState({ status: "ready", neighborhoods });
      setSelectedNeighborhoodId(
        neighborhoods.find((n) => n.is_primary)?.neighborhood_id ?? neighborhoods[0]?.neighborhood_id ?? null,
      );
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function setActiveNeighborhood(neighborhoodId: string) {
    if (state.status !== "ready") return;
    setSelectedNeighborhoodId(neighborhoodId);

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
        <h1 className="font-heading text-xl font-extrabold text-foreground">Check in</h1>
        {state.status === "ready" && selectedNeighborhoodId && (
          <NeighborhoodSwitcher
            neighborhoods={state.neighborhoods}
            selectedId={selectedNeighborhoodId}
            onSelect={(id) => {
              void setActiveNeighborhood(id);
            }}
          />
        )}
      </div>

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

      {state.status === "ready" && (
        <NearestVenues key={selectedNeighborhoodId} neighborhoodId={selectedNeighborhoodId} />
      )}
    </div>
  );
}
