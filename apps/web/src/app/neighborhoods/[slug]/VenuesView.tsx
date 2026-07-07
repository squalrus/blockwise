"use client";

import { useState } from "react";
import Link from "next/link";
import type { VenueListItem } from "@blockwise/types";
import { MapView } from "./MapView";

export function VenuesView({ venues }: { venues: VenueListItem[] }) {
  const [view, setView] = useState<"list" | "map">("list");

  return (
    <div className="flex flex-col gap-4">
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

      {venues.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">No venues yet.</p>
      ) : view === "map" ? (
        <MapView venues={venues} />
      ) : (
        <ul className="flex flex-col gap-2">
          {venues.map((venue) => (
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
