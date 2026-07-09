"use client";

import { type CheckinTarget, useCheckIn } from "./useCheckIn";

export type { CheckinTarget };

// Shared by the venue detail page's NearestVenues-style rows and the
// neighborhood page's POI list -- same GPS geofence/cooldown UX as
// SlideToCheckIn, just a compact button instead of a full-width slider.
export function CheckInButton({ target }: { target: CheckinTarget }) {
  const { status, checkIn } = useCheckIn(target);

  return (
    <div>
      <button
        onClick={checkIn}
        disabled={status.state === "checking"}
        className="rounded-full bg-[#DCEBD3] px-4 py-2 text-sm font-extrabold text-brand-green disabled:opacity-50 dark:bg-[#1A2A1E]"
      >
        {status.state === "checking" ? "Checking in…" : "Check in"}
      </button>

      {status.state === "success" && (
        <p className="mt-2 text-sm font-bold text-brand-green">
          Checked in at {new Date(status.checkedInAt).toLocaleTimeString()}
        </p>
      )}
      {status.state === "too_far" && (
        <p className="mt-2 text-sm text-muted">
          You&apos;re about {Math.round(status.distanceMeters)}m away — get closer to check in.
        </p>
      )}
      {status.state === "cooldown" && (
        <p className="mt-2 text-sm text-muted">
          {status.scope === "target"
            ? "Already checked in here recently."
            : "You checked in somewhere else recently."}{" "}
          Try again after {new Date(status.retryAt).toLocaleTimeString()}.
        </p>
      )}
      {status.state === "error" && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{status.message}</p>
      )}
    </div>
  );
}
