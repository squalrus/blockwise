"use client";

import { useState } from "react";
import { clientApiUrl } from "@/lib/clientApi";
import { getOrCreateDeviceId } from "@/lib/deviceId";
import { getCurrentPosition } from "@/lib/geolocation";

export type CheckinTarget = { type: "venue"; id: string } | { type: "poi"; id: string };

export type CheckinStatus =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "success"; checkedInAt: string }
  | { state: "too_far"; distanceMeters: number }
  | { state: "cooldown"; retryAt: string; scope: "target" | "global" }
  | { state: "error"; message: string };

// GPS geofence/cooldown network logic shared by every slide-to-check-in
// control (venue detail page, POI detail page, and the /checkin page's
// nearest-venue row).
export function useCheckIn(target: CheckinTarget) {
  const [status, setStatus] = useState<CheckinStatus>({ state: "idle" });

  async function checkIn() {
    setStatus({ state: "checking" });
    try {
      const position = await getCurrentPosition();
      const path =
        target.type === "venue" ? `/venues/${target.id}/checkins` : `/pois/${target.id}/checkins`;
      const res = await fetch(clientApiUrl(path), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anonymous_device_id: getOrCreateDeviceId(),
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }),
      });
      const body = await res.json();

      if (res.status === 201) {
        setStatus({ state: "success", checkedInAt: body.checked_in_at });
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

  return { status, checkIn };
}
