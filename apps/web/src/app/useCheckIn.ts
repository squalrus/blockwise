"use client";

import { useState } from "react";
import type { CheckinRewardsSummary } from "@blockwise/types";
import { getAccessToken } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";
import { getCurrentPosition } from "@/lib/geolocation";

export type CheckinStatus =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "success"; checkedInAt: string; rewards: CheckinRewardsSummary }
  | { state: "too_far"; distanceMeters: number }
  | { state: "cooldown"; retryAt: string; scope: "target" | "global" }
  | { state: "error"; message: string };

// GPS geofence/cooldown network logic shared by every slide-to-check-in
// control (location detail page, and the /checkin page's nearest-venue
// row). One location id space (business or POI) since the venue/poi merge
// (BACKLOG.md "POIs and venues managed almost the same").
export function useCheckIn(locationId: string) {
  const [status, setStatus] = useState<CheckinStatus>({ state: "idle" });

  async function checkIn() {
    setStatus({ state: "checking" });
    try {
      const [position, token] = await Promise.all([getCurrentPosition(), getAccessToken()]);
      const res = await fetch(clientApiUrl(`/locations/${locationId}/checkins`), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }),
      });
      const body = await res.json();

      if (res.status === 201) {
        setStatus({ state: "success", checkedInAt: body.checked_in_at, rewards: body.rewards });
      } else if (res.status === 400 && typeof body.distance_meters === "number") {
        setStatus({ state: "too_far", distanceMeters: body.distance_meters });
      } else if (res.status === 429) {
        setStatus({
          state: "cooldown",
          retryAt: body.retry_at,
          scope: body.scope === "target" ? "target" : "global",
        });
      } else {
        setStatus({ state: "error", message: body.error ?? "Check-in failed" });
      }
    } catch {
      setStatus({
        state: "error",
        message: "Couldn't get your location. Location access is required to check in.",
      });
    }
  }

  // Flips the result card back to the slider face -- for a recoverable
  // outcome (too_far/cooldown/error) so the user can drag again, without
  // needing a page reload.
  function reset() {
    setStatus({ state: "idle" });
  }

  return { status, checkIn, reset };
}
