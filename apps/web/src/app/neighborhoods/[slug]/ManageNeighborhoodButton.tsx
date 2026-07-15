"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { NeighborhoodAdminSummary } from "@blockwise/types";
import { getAccessToken, getCurrentUser } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";

type Status = { state: "hidden" } | { state: "visible" };

// Neighborhood profile page: a "Manage" shortcut into the admin dashboard
// (/admin/neighborhood/:slug) for a signed-in user who administers *this*
// neighborhood specifically -- AppUser.is_neighborhood_admin only says the
// account administers *some* neighborhood, so this still has to cross-check
// the administered list against the current slug before showing anything.
export function ManageNeighborhoodButton({ neighborhoodSlug }: { neighborhoodSlug: string }) {
  const [status, setStatus] = useState<Status>({ state: "hidden" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const user = await getCurrentUser();
      if (cancelled || !user || !user.is_neighborhood_admin) return;

      const token = await getAccessToken();
      const res = await fetch(clientApiUrl("/neighborhood-admin/neighborhoods"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (cancelled || !res.ok) return;

      const neighborhoods: NeighborhoodAdminSummary[] = await res.json();
      if (!cancelled && neighborhoods.some((n) => n.slug === neighborhoodSlug)) {
        setStatus({ state: "visible" });
      }
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    return () => {
      cancelled = true;
    };
  }, [neighborhoodSlug]);

  if (status.state === "hidden") return null;

  return (
    <Link
      href={`/admin/neighborhood/${neighborhoodSlug}`}
      className="shrink-0 rounded-full border-2 border-foreground px-4 py-2 text-sm font-extrabold whitespace-nowrap text-foreground"
    >
      Manage
    </Link>
  );
}
