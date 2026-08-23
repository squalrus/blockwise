"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

type Status = "loading" | "hidden" | "idle" | "copied";

// Card action slot's counterpart to NeighborRequestButton -- shown only when
// the signed-in viewer *is* this profile (NeighborRequestButton already
// hides itself in exactly that case, so the two are mutually exclusive and
// safe to render side by side in the same action slot). Mirrors the
// account page's own "View public" link in spirit (a way back and forth
// between the private and public views of your identity), but this is the
// public-side action: hand the URL to someone else. navigator.share covers
// mobile Safari/Chrome's native share sheet; the clipboard write is the
// fallback for desktop browsers without one.
export function ShareProfileButton({ username }: { username: string }) {
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    let cancelled = false;

    getCurrentUser().then((user) => {
      if (cancelled) return;
      setStatus(user?.username === username ? "idle" : "hidden");
    });

    return () => {
      cancelled = true;
    };
  }, [username]);

  async function share() {
    const url = `${window.location.origin}/profile/${username}`;

    if (navigator.share) {
      try {
        await navigator.share({ url, title: "My Spored profile" });
      } catch {
        // Cancelling the native share sheet rejects the promise -- not an
        // error worth surfacing.
      }
      return;
    }

    await navigator.clipboard.writeText(url);
    setStatus("copied");
    setTimeout(() => setStatus("idle"), 2000);
  }

  if (status === "loading" || status === "hidden") return null;

  return (
    <button
      type="button"
      onClick={share}
      className="shrink-0 rounded-full border-2 border-foreground px-3.5 py-2 text-xs font-extrabold whitespace-nowrap text-foreground hover:bg-card"
    >
      {status === "copied" ? "Link copied!" : "Share profile"}
    </button>
  );
}
