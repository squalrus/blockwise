"use client";

import { useState } from "react";
import { useLocalDateTime } from "./useLocalDateTime";

function formatWeekdayName(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "long" });
}

// Screen 2 of the mockup collapses hours to a single "today" line that
// expands into the full weekly list on tap -- previously always-expanded.
export function VenueHours({ hours }: { hours: string[] }) {
  const [open, setOpen] = useState(false);
  // Deferred via useLocalDateTime rather than computed inline: this renders
  // from real server-fetched `hours` on the very first (SSR) pass, so an
  // inline new Date() here would pick the server's weekday, which can
  // disagree with the visitor's near a local day boundary -- the same
  // hydration mismatch (React error #418) that hit EventListItem/Timeline.
  // Falls back to hours[0] until mounted, same as the pre-mount fallback
  // already used when today's line can't be found in `hours` at all.
  const todayName = useLocalDateTime(undefined, formatWeekdayName);
  const todayLine = (todayName ? hours.find((line) => line.startsWith(todayName)) : undefined) ?? hours[0];

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-xl bg-card-alt px-3.5 py-3 text-left"
      >
        <span className="text-sm font-extrabold text-foreground">{todayLine}</span>
        <span className="text-xs font-extrabold text-brand-purple">
          {open ? "Hide hours" : "See all hours"}
        </span>
      </button>
      {open && (
        <ul className="mt-1.5 flex flex-col gap-1 px-3.5 text-[12.5px] text-body-text">
          {hours.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
