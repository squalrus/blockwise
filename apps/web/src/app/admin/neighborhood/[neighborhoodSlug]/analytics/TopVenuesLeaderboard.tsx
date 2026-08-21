"use client";

import type { NeighborhoodAnalyticsTopVenue } from "@blockwise/types";

const COLOR = "var(--brand-amber)";

// Plain HTML meter bars rather than a Recharts chart -- each row needs to be
// a real link out to the venue's location page, which a chart library makes
// awkward. Bar length is relative to the top venue, so the leader always
// reads as "full."
export function TopVenuesLeaderboard({ venues }: { venues: NeighborhoodAnalyticsTopVenue[] }) {
  if (venues.length === 0) {
    return <p className="text-sm text-muted">No check-ins in this window yet.</p>;
  }

  const max = Math.max(...venues.map((v) => v.checkin_count));

  return (
    <ul className="flex flex-col gap-2.5">
      {venues.map((venue, i) => (
        <li key={venue.venue_id}>
          <a
            href={`/location/${venue.venue_id}`}
            className="group flex items-center gap-3 rounded-xl px-1 py-1 hover:bg-muted/10"
          >
            <span className="w-4 shrink-0 text-right font-mono text-[11px] text-muted">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-bold text-foreground group-hover:underline">
                  {venue.name}
                </span>
                <span className="shrink-0 font-mono text-xs font-bold" style={{ color: COLOR }}>
                  {venue.checkin_count}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/15">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.max(4, (venue.checkin_count / max) * 100)}%`, background: COLOR }}
                />
              </div>
            </div>
          </a>
        </li>
      ))}
    </ul>
  );
}
