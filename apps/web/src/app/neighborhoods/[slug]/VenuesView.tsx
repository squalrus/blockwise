"use client";

import { useState } from "react";
import type { VenueListItem } from "@blockwise/types";
import { getCurrentPosition } from "@/lib/geolocation";
import { sortByDistance, type LatLng } from "@/lib/geo";
import { MapView } from "./MapView";
import { PlaceListItem } from "../../PlaceListItem";

type SortMode = "alpha" | "nearest";
type LocationState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; coords: LatLng }
  | { status: "error" };

// BACKLOG.md Ref 23: proximity sort is opt-in (a toggle) rather than the
// default, so alphabetical stays available without needing a location
// permission prompt on every visit.
export function VenuesView({ venues }: { venues: VenueListItem[] }) {
  const [view, setView] = useState<"list" | "map">("list");
  const [sort, setSort] = useState<SortMode>("alpha");
  const [location, setLocation] = useState<LocationState>({ status: "idle" });

  async function handleSortNearest() {
    if (location.status === "ready") {
      setSort("nearest");
      return;
    }

    setLocation({ status: "loading" });
    try {
      const position = await getCurrentPosition();
      setLocation({
        status: "ready",
        coords: { lat: position.coords.latitude, lng: position.coords.longitude },
      });
      setSort("nearest");
    } catch {
      setLocation({ status: "error" });
      setSort("alpha");
    }
  }

  const sortedVenues =
    sort === "nearest" && location.status === "ready"
      ? sortByDistance(venues, location.coords)
      : venues;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex gap-2 text-sm">
          {(["list", "map"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-full px-3 py-1.5 font-extrabold capitalize ${
                view === v ? "bg-foreground text-ink" : "bg-card-alt text-muted"
              }`}
            >
              {v}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => setSort("alpha")}
            className={`rounded-full px-3 py-1.5 font-extrabold ${
              sort === "alpha" ? "bg-foreground text-ink" : "bg-card-alt text-muted"
            }`}
          >
            A-Z
          </button>
          <button
            onClick={handleSortNearest}
            disabled={location.status === "loading"}
            className={`rounded-full px-3 py-1.5 font-extrabold disabled:opacity-50 ${
              sort === "nearest" ? "bg-foreground text-ink" : "bg-card-alt text-muted"
            }`}
          >
            {location.status === "loading" ? "Locating…" : "Nearest"}
          </button>
          {location.status === "error" && (
            <span className="text-xs font-bold text-red-600 dark:text-red-400">
              Couldn&apos;t get your location.
            </span>
          )}
        </div>
      </div>

      {venues.length === 0 ? (
        <p className="text-sm text-muted">No venues yet.</p>
      ) : view === "map" ? (
        <MapView venues={sortedVenues} />
      ) : (
        <ul className="flex flex-col gap-2">
          {sortedVenues.map((venue) => (
            <li key={venue.id}>
              <PlaceListItem
                href={`/location/${venue.id}`}
                id={venue.id}
                name={venue.name}
                subtitle={venue.category_name ?? "Uncategorized"}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
