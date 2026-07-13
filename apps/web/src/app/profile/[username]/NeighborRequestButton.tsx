"use client";

import { useEffect, useState } from "react";
import type { ConnectionSummary } from "@blockwise/types";
import { getAccessToken, getCurrentUser } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";

type NeighborState = "none" | "outgoing" | "incoming" | "accepted";

type Status =
  | { state: "loading" }
  | { state: "hidden" }
  | { state: "idle"; neighborState: NeighborState; connectionId: string | null }
  | { state: "saving"; neighborState: NeighborState; connectionId: string | null }
  | { state: "error"; message: string };

// Public profile page (BACKLOG.md Ref 14/33 "Connect with other users"):
// upper-right card action for the mutual "neighbor" relationship, mirroring
// JoinNeighborhoodButton's single-toggle shape. Hidden when signed out or
// viewing your own profile. Clicking while there's an incoming request
// accepts it via the same POST /me/connections call that sends a fresh
// request -- sendConnectionRequest (apps/api's connections.ts) auto-accepts
// when the other side already has a pending request out to us, so no
// separate accept action is needed here.
export function NeighborRequestButton({ username }: { username: string }) {
  const [status, setStatus] = useState<Status>({ state: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const user = await getCurrentUser();
      if (cancelled) return;
      if (!user || user.username === username) {
        setStatus({ state: "hidden" });
        return;
      }

      const token = await getAccessToken();
      const res = await fetch(clientApiUrl("/me/connections"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (cancelled) return;
      if (!res.ok) {
        setStatus({ state: "error", message: "Couldn't load neighbor status" });
        return;
      }

      const connections: ConnectionSummary[] = await res.json();
      const match = connections.find((c) => c.user.username === username) ?? null;
      setStatus({
        state: "idle",
        neighborState: !match ? "none" : match.status === "accepted" ? "accepted" : match.direction,
        connectionId: match?.id ?? null,
      });
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [username]);

  async function toggle() {
    if (status.state !== "idle") return;
    const { neighborState, connectionId } = status;
    setStatus({ state: "saving", neighborState, connectionId });

    try {
      const token = await getAccessToken();

      if (neighborState === "none" || neighborState === "incoming") {
        const res = await fetch(clientApiUrl("/me/connections"), {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ username }),
        });
        if (!res.ok) throw new Error();
        const connection: { id: string; status: "pending" | "accepted" } = await res.json();
        setStatus({
          state: "idle",
          neighborState: connection.status === "accepted" ? "accepted" : "outgoing",
          connectionId: connection.id,
        });
        return;
      }

      if (!connectionId) throw new Error();
      const res = await fetch(clientApiUrl(`/me/connections/${connectionId}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      setStatus({ state: "idle", neighborState: "none", connectionId: null });
    } catch {
      setStatus({ state: "error", message: "That didn't go through -- try again." });
    }
  }

  if (status.state === "loading" || status.state === "hidden") return null;

  if (status.state === "error") {
    return <p className="text-sm text-red-600 dark:text-red-400">{status.message}</p>;
  }

  const neighborState = status.neighborState;
  const label =
    neighborState === "accepted"
      ? "✓ Neighbors"
      : neighborState === "outgoing"
        ? "Requested"
        : neighborState === "incoming"
          ? "Accept request"
          : "+ Add neighbor";
  const filled = neighborState === "accepted" || neighborState === "incoming";

  return (
    <button
      onClick={toggle}
      disabled={status.state === "saving"}
      aria-pressed={neighborState === "accepted"}
      className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-extrabold whitespace-nowrap disabled:opacity-50 ${
        filled ? "bg-brand-green text-on-accent" : "border-2 border-foreground text-foreground"
      }`}
    >
      {label}
    </button>
  );
}
