"use client";

import { useState } from "react";
import Link from "next/link";
import type { VenueListItem } from "@blockwise/types";
import { getCurrentPosition } from "@/lib/geolocation";
import { sortByDistance, type LatLng } from "@/lib/geo";
import { MapView } from "./MapView";

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
              className={`rounded-full border px-3 py-1 capitalize ${
                view === v
                  ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                  : "border-black/[.08] text-zinc-600 hover:bg-zinc-100 dark:border-white/[.145] dark:text-zinc-400 dark:hover:bg-zinc-900"
              }`}
            >
              {v}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => setSort("alpha")}
            className={`rounded-full border px-3 py-1 ${
              sort === "alpha"
                ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                : "border-black/[.08] text-zinc-600 hover:bg-zinc-100 dark:border-white/[.145] dark:text-zinc-400 dark:hover:bg-zinc-900"
            }`}
          >
            A-Z
          </button>
          <button
            onClick={handleSortNearest}
            disabled={location.status === "loading"}
            className={`rounded-full border px-3 py-1 disabled:opacity-50 ${
              sort === "nearest"
                ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                : "border-black/[.08] text-zinc-600 hover:bg-zinc-100 dark:border-white/[.145] dark:text-zinc-400 dark:hover:bg-zinc-900"
            }`}
          >
            {location.status === "loading" ? "Locating…" : "Nearest"}
          </button>
          {location.status === "error" && (
            <span className="text-xs text-red-600 dark:text-red-400">
              Couldn&apos;t get your location.
            </span>
          )}
        </div>
      </div>

      {venues.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">No venues yet.</p>
      ) : view === "map" ? (
        <MapView venues={sortedVenues} />
      ) : (
        <ul className="flex flex-col gap-2">
          {sortedVenues.map((venue) => (
            <li key={venue.id}>
              <Link
                href={`/venues/${venue.id}`}
                className="block rounded-lg border border-black/[.08] px-4 py-3 text-sm hover:bg-zinc-100 dark:border-white/[.145] dark:hover:bg-zinc-900"
              >
                <span className="font-medium text-black dark:text-zinc-50">{venue.name}</span>
                <span className="ml-2 text-zinc-600 dark:text-zinc-400">
                  {venue.category_name ?? "Uncategorized"} · {venue.address}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
