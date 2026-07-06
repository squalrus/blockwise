"use client";

import { useEffect, useState } from "react";
import { clientApiUrl } from "@/lib/clientApi";
import { getOrCreateDeviceId } from "@/lib/deviceId";

type Status =
  | { state: "loading" }
  | { state: "idle"; favorited: boolean }
  | { state: "saving"; favorited: boolean }
  | { state: "error"; message: string };

export function FavoriteButton({ venueId }: { venueId: string }) {
  const [status, setStatus] = useState<Status>({ state: "loading" });

  useEffect(() => {
    let cancelled = false;
    const deviceId = getOrCreateDeviceId();

    fetch(clientApiUrl(`/venues/${venueId}/favorites?anonymous_device_id=${deviceId}`))
      .then((res) => res.json())
      .then((body) => {
        if (!cancelled) setStatus({ state: "idle", favorited: Boolean(body.favorited) });
      })
      .catch(() => {
        if (!cancelled) setStatus({ state: "error", message: "Couldn't load favorite status" });
      });

    return () => {
      cancelled = true;
    };
  }, [venueId]);

  async function toggleFavorite() {
    if (status.state !== "idle") return;
    const wasFavorited = status.favorited;
    setStatus({ state: "saving", favorited: wasFavorited });

    try {
      const res = await fetch(clientApiUrl(`/venues/${venueId}/favorites`), {
        method: wasFavorited ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anonymous_device_id: getOrCreateDeviceId() }),
      });
      if (!res.ok) throw new Error("Request failed");
      setStatus({ state: "idle", favorited: !wasFavorited });
    } catch {
      setStatus({
        state: "error",
        message: wasFavorited ? "Couldn't remove favorite" : "Couldn't add favorite",
      });
    }
  }

  if (status.state === "loading") return null;

  const favorited = status.state === "error" ? false : status.favorited;

  return (
    <div>
      <button
        onClick={toggleFavorite}
        disabled={status.state === "saving"}
        aria-pressed={favorited}
        className="rounded-md border border-black/[.08] px-4 py-2 text-sm font-medium text-black disabled:opacity-50 dark:border-white/[.145] dark:text-zinc-50"
      >
        {favorited ? "★ Favorited" : "☆ Favorite"}
      </button>
      {status.state === "error" && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{status.message}</p>
      )}
    </div>
  );
}
