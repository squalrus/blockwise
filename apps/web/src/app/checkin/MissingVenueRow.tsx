"use client";

import { useState } from "react";
import type { NeighborhoodMembership } from "@blockwise/types";
import { MissingVenueReportForm } from "../MissingVenueReportForm";

// "Missing a venue?" row (BACKLOG.md Ref 80/96) appended to the bottom of
// NearestVenues -- visually matches PlaceListItem's action-expanded row
// (rounded-2xl bg-card-alt card, expand-in-place rather than navigating) but
// isn't a real venue, so it can't reuse PlaceListItem directly (that
// component requires an href/id to link to).
export function MissingVenueRow({
  neighborhoods,
  defaultNeighborhoodId,
}: {
  neighborhoods: NeighborhoodMembership[];
  defaultNeighborhoodId: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-card-alt px-4 py-3 text-sm">
        <span className="text-lg" aria-hidden="true">
          🍄
        </span>
        <span className="font-bold text-brand-green">
          Reported — the neighborhood&apos;s admins have been notified.
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5 rounded-2xl bg-card-alt px-4 py-3.5 text-sm">
      <button type="button" onClick={() => setExpanded((cur) => !cur)} className="flex items-center gap-3 text-left">
        <span
          className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 border-dashed border-muted text-xs font-extrabold text-muted"
          aria-hidden="true"
        >
          +
        </span>
        <span className="font-extrabold text-foreground">Missing a venue?</span>
      </button>

      {expanded && (
        <MissingVenueReportForm
          neighborhoods={neighborhoods}
          defaultNeighborhoodId={defaultNeighborhoodId}
          surface="inline"
          onSent={() => setSent(true)}
        />
      )}
    </div>
  );
}
