"use client";

import { useEffect, useState } from "react";
import { getAccessToken, getCurrentUser } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";

type Status =
  | { state: "loading" }
  | { state: "signed_out" }
  | { state: "idle"; following: boolean }
  | { state: "saving"; following: boolean }
  | { state: "error" };

// Compact follow/unfollow toggle for EventListItem's `actions` slot
// (BACKLOG.md Ref 81), matching the admin Hide/Delete text-button styling
// there rather than FavoriteButton's standalone pill (this renders inside a
// list row, not on its own page). Signed-in only per that item's scoping --
// renders nothing for a signed-out visitor rather than prompting to sign in,
// since a compact list-row action isn't the place for that prompt.
export function FollowEventButton({ eventId }: { eventId: string }) {
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
        const res = await fetch(clientApiUrl(`/events/${eventId}/follow`), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const body = await res.json();
        if (!cancelled) setStatus({ state: "idle", following: Boolean(body.following) });
      } catch {
        if (!cancelled) setStatus({ state: "error" });
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  async function toggleFollow() {
    if (status.state !== "idle") return;
    const wasFollowing = status.following;
    setStatus({ state: "saving", following: wasFollowing });

    try {
      const token = await getAccessToken();
      const res = await fetch(clientApiUrl(`/events/${eventId}/follow`), {
        method: wasFollowing ? "DELETE" : "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Request failed");
      setStatus({ state: "idle", following: !wasFollowing });
    } catch {
      setStatus({ state: "error" });
    }
  }

  if (status.state === "loading" || status.state === "signed_out" || status.state === "error") return null;

  return (
    <button
      type="button"
      onClick={toggleFollow}
      disabled={status.state === "saving"}
      aria-pressed={status.following}
      className="text-xs font-bold text-foreground hover:underline disabled:opacity-50"
    >
      {status.following ? "✓ Following" : "+ Follow"}
    </button>
  );
}
