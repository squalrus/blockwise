"use client";

import { useEffect, useState } from "react";
import type { ConnectionSummary } from "@blockwise/types";
import { getAccessToken, getCurrentUser } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";

type Access = "checking" | "hidden" | "visible";

// Public profile page (BACKLOG.md Ref 14/33 "Connect with other users"):
// gates everything below the summary card behind an accepted neighbor
// connection -- a public profile still only ever shows its badges,
// neighborhoods, and recent check-ins to accepted neighbors (or the
// profile's own owner), not to every visitor. Determined client-side
// (mirroring NeighborRequestButton's connection lookup) since auth is
// browser-only in this app -- there's no server-side session to check
// during the page's server-rendered fetch. Starts "hidden" rather than
// flashing the gated content before the check resolves, since revealing
// then hiding would leak the very thing being gated; likewise defaults to
// hidden if the connections lookup itself fails, so a network hiccup fails
// closed instead of exposing private data.
export function ProfileDetails({ username, children }: { username: string; children: React.ReactNode }) {
  const [access, setAccess] = useState<Access>("checking");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const user = await getCurrentUser();
      if (cancelled) return;
      if (user?.username === username) {
        setAccess("visible");
        return;
      }
      if (!user) {
        setAccess("hidden");
        return;
      }

      const token = await getAccessToken();
      const res = await fetch(clientApiUrl("/me/connections"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (cancelled) return;
      if (!res.ok) {
        setAccess("hidden");
        return;
      }

      const connections: ConnectionSummary[] = await res.json();
      const isNeighbor = connections.some((c) => c.user.username === username && c.status === "accepted");
      setAccess(isNeighbor ? "visible" : "hidden");
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [username]);

  if (access === "checking") return null;
  if (access === "hidden") {
    return (
      <p className="text-sm text-muted">Add this person as a neighbor to see their badges, neighborhoods, and check-ins.</p>
    );
  }
  return <>{children}</>;
}
