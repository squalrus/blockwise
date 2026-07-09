"use client";

import { useState } from "react";
import Link from "next/link";
import type { VenueListItem } from "@blockwise/types";
import { getCurrentPosition } from "@/lib/geolocation";
import { sortByDistance, type LatLng } from "@/lib/geo";
import { MushroomLogo } from "../../MushroomLogo";
import { MapView } from "./MapView";

const PIN_COLORS = ["var(--brand-orange)", "var(--brand-green)", "var(--brand-purple)", "var(--brand-amber)"];

function pinColorFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return PIN_COLORS[Math.abs(hash) % PIN_COLORS.length];
}

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
              <Link
                href={`/venues/${venue.id}`}
                className="flex items-center gap-3 rounded-2xl bg-card-alt px-4 py-3 text-sm"
              >
                <MushroomLogo size={18} capColor={pinColorFor(venue.id)} />
                <span className="font-extrabold text-foreground">{venue.name}</span>
                <span className="text-muted">
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
