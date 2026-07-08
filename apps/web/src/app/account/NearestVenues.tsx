"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { VenueListItem } from "@blockwise/types";
import { clientApiUrl } from "@/lib/clientApi";
import { sortByDistance, type LatLng } from "@/lib/geo";
import { getCurrentPosition } from "@/lib/geolocation";
import { CheckInButton } from "../venues/[id]/CheckInButton";

const NEAREST_LIMIT = 10;

type State =
  | { status: "loading" }
  | { status: "no_home" }
  | { status: "ready"; venues: VenueListItem[] }
  | { status: "error" };

// BACKLOG.md Ref 47: the account page's primary "next action" -- check in --
// backed by the nearest venues in the user's home neighborhood (Ref 23's
// proximity sort, scoped to one neighborhood rather than the cross-
// neighborhood venue list). Falls back to alphabetical (the API's default
// order) if location access isn't available, same as VenuesView.
export function NearestVenues({ homeNeighborhoodId }: { homeNeighborhoodId: string | null }) {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    if (!homeNeighborhoodId) {
      setState({ status: "no_home" });
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(clientApiUrl(`/neighborhoods/${homeNeighborhoodId}/venues`));
        if (!res.ok) throw new Error("Failed to load venues");
        const venues = (await res.json()) as VenueListItem[];
        if (cancelled) return;

        let ordered = venues;
        try {
          const position = await getCurrentPosition();
          const coords: LatLng = { lat: position.coords.latitude, lng: position.coords.longitude };
          ordered = sortByDistance(venues, coords);
        } catch {
          // Location denied/unavailable -- keep the API's alphabetical order.
        }
        if (!cancelled) setState({ status: "ready", venues: ordered.slice(0, NEAREST_LIMIT) });
      } catch {
        if (!cancelled) setState({ status: "error" });
      }
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    return () => {
      cancelled = true;
    };
  }, [homeNeighborhoodId]);

  if (state.status === "loading") return null;

  if (state.status === "no_home") {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Set a home neighborhood below to see nearby venues to check in to.
      </p>
    );
  }

  if (state.status === "error") {
    return <p className="text-sm text-red-600 dark:text-red-400">Couldn&apos;t load nearby venues.</p>;
  }

  if (state.venues.length === 0) {
    return <p className="text-sm text-zinc-600 dark:text-zinc-400">No venues yet in your home neighborhood.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {state.venues.map((venue) => (
        <li
          key={venue.id}
          className="rounded-lg border border-black/[.08] px-4 py-3 text-sm dark:border-white/[.145]"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <Link
                href={`/venues/${venue.id}`}
                className="font-medium text-black hover:underline dark:text-zinc-50"
              >
                {venue.name}
              </Link>
              <p className="text-zinc-600 dark:text-zinc-400">
                {venue.category_name ?? "Uncategorized"} · {venue.address}
              </p>
            </div>
          </div>
          <div className="mt-2">
            <CheckInButton target={{ type: "venue", id: venue.id }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
