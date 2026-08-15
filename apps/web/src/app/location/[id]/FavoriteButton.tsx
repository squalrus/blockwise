"use client";

import { useEffect, useState } from "react";
import { getAccessToken, getCurrentUser } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";
import { SignInPrompt } from "../../SignInPrompt";

type Status =
  | { state: "loading" }
  | { state: "signed_out" }
  | { state: "idle"; favorited: boolean }
  | { state: "saving"; favorited: boolean }
  | { state: "error"; message: string };

export function FavoriteButton({
  venueId,
  // Component-library preview only (apps/web/src/app/dev/components) -- skips
  // the live favorite-status fetch and starts idle in this state instead, so
  // both states can be reviewed side by side rather than depending on the
  // signed-in viewer's real favorites. Toggling still works locally (no
  // network call), mirroring JoinNeighborhoodButton's mockJoined pattern.
  // Never passed in real usage.
  mockFavorited,
}: {
  venueId: string;
  mockFavorited?: boolean;
}) {
  const [status, setStatus] = useState<Status>(
    mockFavorited === undefined ? { state: "loading" } : { state: "idle", favorited: mockFavorited }
  );

  useEffect(() => {
    if (mockFavorited !== undefined) return;
    let cancelled = false;

    async function load() {
      const user = await getCurrentUser();
      if (cancelled) return;
      if (!user) {
        setStatus({ state: "signed_out" });
        return;
      }

      try {
        const token = await getAccessToken();
        const res = await fetch(clientApiUrl(`/venues/${venueId}/favorites`), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const body = await res.json();
        if (!cancelled) setStatus({ state: "idle", favorited: Boolean(body.favorited) });
      } catch {
        if (!cancelled) setStatus({ state: "error", message: "Couldn't load favorite status" });
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [venueId, mockFavorited]);

  async function toggleFavorite() {
    if (status.state !== "idle") return;
    const wasFavorited = status.favorited;

    if (mockFavorited !== undefined) {
      setStatus({ state: "idle", favorited: !wasFavorited });
      return;
    }

    setStatus({ state: "saving", favorited: wasFavorited });

    try {
      const token = await getAccessToken();
      const res = await fetch(clientApiUrl(`/venues/${venueId}/favorites`), {
        method: wasFavorited ? "DELETE" : "POST",
        headers: { Authorization: `Bearer ${token}` },
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
  if (status.state === "signed_out") return <SignInPrompt message="to favorite this place." />;

  const favorited = status.state === "error" ? false : status.favorited;

  return (
    <div>
      <button
        onClick={toggleFavorite}
        disabled={status.state === "saving"}
        aria-pressed={favorited}
        className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-extrabold whitespace-nowrap disabled:opacity-50 ${
          favorited ? "bg-brand-green text-on-accent" : "border-2 border-foreground text-foreground"
        }`}
      >
        {favorited ? "★ Favorited" : "☆ Favorite"}
      </button>
      {status.state === "error" && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{status.message}</p>
      )}
    </div>
  );
}
