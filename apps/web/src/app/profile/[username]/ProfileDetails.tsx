"use client";

import { useEffect, useState } from "react";
import type { ConnectionSummary, MutualNeighborsSummary } from "@blockwise/types";
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
  // Trust signal shown alongside the "hidden" gate message -- how many of
  // the signed-in viewer's own accepted neighbors are also an accepted
  // neighbor of this profile (GET /me/connections/mutual/:username), a hint
  // worth seeing *before* deciding to send a request. null covers both "not
  // loaded yet" and "not applicable" (signed out, or already a neighbor) so
  // the count only ever renders once it's actually known and > 0.
  const [mutualCount, setMutualCount] = useState<number | null>(null);

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

      if (isNeighbor) return;
      const mutualRes = await fetch(clientApiUrl(`/me/connections/mutual/${username}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (cancelled || !mutualRes.ok) return;
      const summary: MutualNeighborsSummary = await mutualRes.json();
      setMutualCount(summary.count);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [username]);

  if (access === "checking") return null;
  if (access === "hidden") {
    return (
      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted">Add this person as a neighbor to see their badges, neighborhoods, and check-ins.</p>
        {mutualCount !== null && mutualCount > 0 && (
          <p className="text-xs font-bold text-brand-purple">
            {mutualCount === 1 ? "1 mutual neighbor" : `${mutualCount} mutual neighbors`}
          </p>
        )}
      </div>
    );
  }
  return <>{children}</>;
}
