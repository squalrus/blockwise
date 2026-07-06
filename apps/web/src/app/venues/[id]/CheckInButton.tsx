"use client";

import { useState } from "react";
import { clientApiUrl } from "@/lib/clientApi";
import { getOrCreateDeviceId } from "@/lib/deviceId";

type Status =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "success"; checkedInAt: string }
  | { state: "too_far"; distanceMeters: number }
  | { state: "cooldown"; retryAt: string }
  | { state: "error"; message: string };

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10_000,
    });
  });
}

export function CheckInButton({ venueId }: { venueId: string }) {
  const [status, setStatus] = useState<Status>({ state: "idle" });

  async function handleCheckIn() {
    setStatus({ state: "checking" });
    try {
      const position = await getCurrentPosition();
      const res = await fetch(clientApiUrl(`/venues/${venueId}/checkins`), {
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
        setStatus({ state: "cooldown", retryAt: body.retry_at });
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

  return (
    <div className="rounded-lg border border-black/[.08] px-6 py-4 dark:border-white/[.145]">
      <button
        onClick={handleCheckIn}
        disabled={status.state === "checking"}
        className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {status.state === "checking" ? "Checking in…" : "Check in"}
      </button>

      {status.state === "success" && (
        <p className="mt-2 text-sm text-black dark:text-zinc-50">
          Checked in at {new Date(status.checkedInAt).toLocaleTimeString()}
        </p>
      )}
      {status.state === "too_far" && (
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          You&apos;re about {Math.round(status.distanceMeters)}m away — get closer to check in.
        </p>
      )}
      {status.state === "cooldown" && (
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Already checked in here recently. Try again after{" "}
          {new Date(status.retryAt).toLocaleTimeString()}.
        </p>
      )}
      {status.state === "error" && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{status.message}</p>
      )}
    </div>
  );
}
