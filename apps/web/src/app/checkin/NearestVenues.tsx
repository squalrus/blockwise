"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { NeighborhoodMembership, NeighborhoodProfile, VenueListItem } from "@blockwise/types";
import { MushroomLoader } from "@blockwise/ui";
import { clientApiUrl } from "@/lib/clientApi";
import { sortByDistance, type LatLng } from "@/lib/geo";
import { getCurrentPosition } from "@/lib/geolocation";
import { PlaceListItem } from "../PlaceListItem";
import { SlideToCheckIn } from "../SlideToCheckIn";
import { MissingVenueRow } from "./MissingVenueRow";

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
//
// BACKLOG.md Ref 93: GET /neighborhoods/:id/venues only ever returns
// business-kind locations, so POIs (curated points of interest at
// multi-POI venues) are merged in separately from the neighborhood profile
// endpoint's `pois` field, same as the public Locations tab
// (neighborhoods/[slug]/locations/page.tsx) does.
export function NearestVenues({
  neighborhoodId,
  neighborhoodSlug,
  neighborhoods,
}: {
  neighborhoodId: string | null;
  neighborhoodSlug: string | null;
  // Full membership list, for the "Missing a venue?" row's neighborhood
  // picker (BACKLOG.md Ref 80/96) -- already loaded by the parent CheckinPage,
  // so this is threaded down rather than fetched again here.
  neighborhoods: NeighborhoodMembership[];
}) {
  const [state, setState] = useState<State>({ status: "loading" });
  // Which row (if any) is expanded to reveal its own slide-to-check-in
  // control -- single-select accordion across every row, including the
  // first, which defaults to expanded once venues load (see load() below)
  // but collapses like any other row once a different one is picked.
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!neighborhoodId || !neighborhoodSlug) {
      setState({ status: "no_neighborhood" });
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const [venuesRes, profileRes] = await Promise.all([
          fetch(clientApiUrl(`/neighborhoods/${neighborhoodId}/venues`)),
          fetch(clientApiUrl(`/neighborhoods/${neighborhoodSlug}`)),
        ]);
        if (!venuesRes.ok) throw new Error("Failed to load venues");
        if (!profileRes.ok) throw new Error("Failed to load neighborhood profile");
        const businessVenues = (await venuesRes.json()) as VenueListItem[];
        const profile = (await profileRes.json()) as NeighborhoodProfile;
        if (cancelled) return;

        const pois: VenueListItem[] = profile.pois
          .filter((poi) => poi.lat !== null && poi.lng !== null)
          .map((poi) => ({
            id: poi.id,
            name: poi.name,
            address: poi.address ?? "",
            lat: poi.lat as number,
            lng: poi.lng as number,
            category_name: "Point of interest",
            category_group: null,
          }));
        const venues = [...businessVenues, ...pois];

        let ordered = venues;
        try {
          const position = await getCurrentPosition();
          const coords: LatLng = { lat: position.coords.latitude, lng: position.coords.longitude };
          ordered = sortByDistance(venues, coords);
        } catch {
          // Location denied/unavailable -- keep the API's alphabetical order.
        }
        const ready = ordered.slice(0, NEAREST_LIMIT);
        if (!cancelled) {
          setState({ status: "ready", venues: ready });
          setExpandedId(ready[0]?.id ?? null);
        }
      } catch {
        if (!cancelled) setState({ status: "error" });
      }
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    return () => {
      cancelled = true;
    };
  }, [neighborhoodId, neighborhoodSlug]);

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

  return (
    <div className="flex flex-col gap-2.5">
      {state.venues.length === 0 ? (
        <p className="text-sm text-muted">No venues yet in this neighborhood.</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {state.venues.map((venue) => (
            <li key={venue.id}>
              <PlaceListItem
                href={`/location/${venue.id}`}
                id={venue.id}
                name={venue.name}
                subtitle={`${venue.category_name ?? "Uncategorized"} · ${venue.address}`}
                action={expandedId === venue.id ? <SlideToCheckIn locationId={venue.id} /> : undefined}
                onSelect={() => setExpandedId((cur) => (cur === venue.id ? null : venue.id))}
              />
            </li>
          ))}
        </ul>
      )}
      <MissingVenueRow neighborhoods={neighborhoods} defaultNeighborhoodId={neighborhoodId} />
    </div>
  );
}
