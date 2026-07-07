"use client";

import { useEffect, useState } from "react";
import type { NeighborhoodMembership } from "@blockwise/types";
import { getAccessToken, getCurrentUser } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";

type Status =
  | { state: "loading" }
  | { state: "signed_out" }
  | { state: "idle"; joined: boolean }
  | { state: "saving"; joined: boolean }
  | { state: "error"; message: string };

// Neighborhood profile page (BACKLOG.md "Neighborhoods on landing page and
// user profile"): join/leave in place, mirroring FavoriteButton's shape but
// sign-in required (see neighborhoodMembers.ts) rather than device-scoped.
export function JoinNeighborhoodButton({ neighborhoodId }: { neighborhoodId: string }) {
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

      const token = await getAccessToken();
      const res = await fetch(clientApiUrl("/me/neighborhoods"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (cancelled) return;
      if (!res.ok) {
        setStatus({ state: "error", message: "Couldn't load membership status" });
        return;
      }

      const memberships: NeighborhoodMembership[] = await res.json();
      setStatus({
        state: "idle",
        joined: memberships.some((m) => m.neighborhood_id === neighborhoodId),
      });
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    return () => {
      cancelled = true;
    };
  }, [neighborhoodId]);

  async function toggleJoined() {
    if (status.state !== "idle") return;
    const wasJoined = status.joined;
    setStatus({ state: "saving", joined: wasJoined });

    try {
      const token = await getAccessToken();
      const res = await fetch(clientApiUrl(`/neighborhoods/${neighborhoodId}/join`), {
        method: wasJoined ? "DELETE" : "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Request failed");
      setStatus({ state: "idle", joined: !wasJoined });
    } catch {
      setStatus({
        state: "error",
        message: wasJoined ? "Couldn't leave neighborhood" : "Couldn't join neighborhood",
      });
    }
  }

  if (status.state === "loading") return null;

  if (status.state === "signed_out") {
    return (
      <a
        href="/login"
        className="rounded-md border border-black/[.08] px-4 py-2 text-sm font-medium text-black dark:border-white/[.145] dark:text-zinc-50"
      >
        Log in to join
      </a>
    );
  }

  const joined = status.state === "error" ? false : status.joined;

  return (
    <div>
      <button
        onClick={toggleJoined}
        disabled={status.state === "saving"}
        aria-pressed={joined}
        className="rounded-md border border-black/[.08] px-4 py-2 text-sm font-medium text-black disabled:opacity-50 dark:border-white/[.145] dark:text-zinc-50"
      >
        {joined ? "Joined" : "Join neighborhood"}
      </button>
      {status.state === "error" && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{status.message}</p>
      )}
    </div>
  );
}
