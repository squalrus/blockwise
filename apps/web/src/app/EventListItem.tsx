"use client";

import { useState } from "react";
import type { Event } from "@blockwise/types";

function formatEventDate(startTime: string): { month: string; day: string } {
  const date = new Date(startTime);
  return {
    month: date.toLocaleString(undefined, { month: "short" }).toUpperCase(),
    day: String(date.getDate()),
  };
}

// Shared event row (neighborhood-admin Events tab, public Upcoming events
// tab, public Today tab's "Today's events" section) -- a date badge, title,
// time/venue/location, and an optional feed-vs-manual source pill, with the
// description tucked behind a click-to-expand rather than always shown (most
// rows are just being scanned for what/when). `actions`, when passed,
// renders admin-only controls (Hide/Delete) -- omitted on the public pages.
// `showSource` defaults to true for the admin tab, where "feed" vs "manual"
// is meaningful (it's what a re-sync can and can't touch); the public
// neighborhood pages pass false since a visitor has no use for that
// distinction.
export function EventListItem({
  event,
  actions,
  showSource = true,
}: {
  event: Event;
  actions?: React.ReactNode;
  showSource?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const { month, day } = formatEventDate(event.start_time);

  const metaParts = [
    new Date(event.start_time).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
  ];
  if (event.venue_name) metaParts.push(`@ ${event.venue_name}`);
  if (event.location) metaParts.push(event.location);

  return (
    <li className={`rounded-2xl bg-card-alt px-3.5 py-3 text-sm ${event.status === "hidden" ? "opacity-60" : ""}`}>
      <div className="flex items-center gap-3.5">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-3.5 text-left"
        >
          <div className="flex w-13 shrink-0 flex-col items-center rounded-xl border border-border bg-card py-1.5">
            <span className="font-mono text-[10px] font-bold text-red-600 dark:text-red-400">{month}</span>
            <span className="font-heading text-xl leading-none font-extrabold">{day}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="truncate font-heading text-[15px] font-bold text-foreground">{event.title}</p>
              {event.status === "hidden" && (
                <span className="shrink-0 rounded-full bg-card px-2 py-0.5 font-mono text-[10px] font-bold text-muted">
                  Hidden
                </span>
              )}
            </div>
            <p className="mt-0.5 truncate text-xs text-muted">{metaParts.join(" · ")}</p>
          </div>
          {showSource && (
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 font-mono text-[10px] font-bold ${
                event.source === "ical"
                  ? "bg-brand-green/20 text-brand-green"
                  : "bg-brand-purple/20 text-brand-purple"
              }`}
            >
              {event.source === "ical" ? "feed" : "manual"}
            </span>
          )}
        </button>
        {actions && <div className="flex shrink-0 flex-col items-end gap-1">{actions}</div>}
      </div>
      {expanded && (
        <p className="mt-2.5 border-t border-border pt-2.5 pl-16.5 text-[13px] leading-relaxed text-body-text">
          {event.description}
        </p>
      )}
    </li>
  );
}
