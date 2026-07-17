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

export function FavoriteButton({ venueId }: { venueId: string }) {
  const [status, setStatus] = useState<Status>({ state: "loading" });

  useEffect(() => {
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
  }, [venueId]);

  async function toggleFavorite() {
    if (status.state !== "idle") return;
    const wasFavorited = status.favorited;
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
        className="rounded-full border-2 border-foreground px-4 py-2 text-sm font-extrabold text-foreground disabled:opacity-50"
      >
        {favorited ? "★ Favorited" : "☆ Favorite"}
      </button>
      {status.state === "error" && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{status.message}</p>
      )}
    </div>
  );
}
