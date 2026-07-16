"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { VenueListItem } from "@blockwise/types";
import { MushroomLoader } from "@blockwise/ui";
import { clientApiUrl } from "@/lib/clientApi";
import { sortByDistance, type LatLng } from "@/lib/geo";
import { getCurrentPosition } from "@/lib/geolocation";
import { PlaceListItem } from "../PlaceListItem";
import { SlideToCheckIn } from "../SlideToCheckIn";

const NEAREST_LIMIT = 7;

type State =
  | { status: "loading" }
  | { status: "no_neighborhood" }
  | { status: "ready"; venues: VenueListItem[] }
  | { status: "error" };

// BACKLOG.md Ref 47: the /checkin page's primary action -- check in --
// backed by the nearest venues in the selected neighborhood (Ref 23's
// proximity sort, scoped to one neighborhood rather than the cross-
// neighborhood venue list; defaults to the user's active neighborhood but
// switchable via NeighborhoodSwitcher). Falls back to alphabetical (the
// API's default order) if location access isn't available, same as
// VenuesView.
export function NearestVenues({ neighborhoodId }: { neighborhoodId: string | null }) {
  const [state, setState] = useState<State>({ status: "loading" });
  // Which non-top row (if any) is expanded to reveal its own slide-to-check-in
  // control -- the top spot always shows its control, so this never tracks it.
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!neighborhoodId) {
      setState({ status: "no_neighborhood" });
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(clientApiUrl(`/neighborhoods/${neighborhoodId}/venues`));
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
  }, [neighborhoodId]);

  // Covers the venues fetch and the (often slower, permission-prompt-gated)
  // geolocation lookup below -- both run before this ever leaves "loading",
  // so keeping the mark on screen here avoids a blank gap between the
  // /checkin page's own loader handing off and this one finishing.
  if (state.status === "loading") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <MushroomLoader size={72} />
      </div>
    );
  }

  if (state.status === "no_neighborhood") {
    return (
      <p className="text-sm text-muted">
        Join a neighborhood on the{" "}
        <Link href="/neighborhoods" className="font-bold text-brand-purple hover:text-brand-orange">
          Neighborhoods page
        </Link>{" "}
        to see nearby venues to check in to.
      </p>
    );
  }

  if (state.status === "error") {
    return <p className="text-sm text-red-600 dark:text-red-400">Couldn&apos;t load nearby venues.</p>;
  }

  if (state.venues.length === 0) {
    return <p className="text-sm text-muted">No venues yet in this neighborhood.</p>;
  }

  return (
    <ul className="flex flex-col gap-2.5">
      {state.venues.map((venue, index) => (
        <li key={venue.id}>
          <PlaceListItem
            href={`/location/${venue.id}`}
            id={venue.id}
            name={venue.name}
            subtitle={`${venue.category_name ?? "Uncategorized"} · ${venue.address}`}
            action={
              index === 0 || expandedId === venue.id ? <SlideToCheckIn locationId={venue.id} /> : undefined
            }
            onSelect={index === 0 ? undefined : () => setExpandedId((cur) => (cur === venue.id ? null : venue.id))}
          />
        </li>
      ))}
    </ul>
  );
}
