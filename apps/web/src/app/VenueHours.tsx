"use client";

import { useState } from "react";

// Screen 2 of the mockup collapses hours to a single "today" line that
// expands into the full weekly list on tap -- previously always-expanded.
export function VenueHours({ hours }: { hours: string[] }) {
  const [open, setOpen] = useState(false);
  const todayName = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const todayLine = hours.find((line) => line.startsWith(todayName)) ?? hours[0];

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
