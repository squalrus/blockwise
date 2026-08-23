"use client";

import { useEffect, useState } from "react";
import type { CouponWithClaim } from "@blockwise/types";
import { getAccessToken, getCurrentUser } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";
import { CouponCard } from "./CouponCard";

type Status = { state: "loading" } | { state: "ready"; coupons: CouponWithClaim[]; signedIn: boolean } | { state: "error" };

// Venue coupons (BACKLOG.md Ref 83, replacing the old Announcements
// section) -- fully client-fetched (like FavoriteButton) rather than
// server-rendered, since claim/eligibility state is per-viewer and the
// server component has no auth context.
//
// `emptyMessage` (BACKLOG.md Ref 101 redesign's Coupons tab, LocationTabs.tsx)
// renders a fallback line once loading resolves to zero coupons, rather than
// the tab going silently blank -- omitted by default so this still renders
// nothing while loading/on error, same as before the tab existed.
export function CouponsSection({ venueId, emptyMessage }: { venueId: string; emptyMessage?: string }) {
  const [status, setStatus] = useState<Status>({ state: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const user = await getCurrentUser();
      try {
        const headers: Record<string, string> = {};
        if (user) headers.Authorization = `Bearer ${await getAccessToken()}`;
        const res = await fetch(clientApiUrl(`/venues/${venueId}/coupons`), { headers });
        if (!res.ok) throw new Error("Failed to load coupons");
        const coupons = (await res.json()) as CouponWithClaim[];
        if (!cancelled) setStatus({ state: "ready", coupons, signedIn: Boolean(user) });
      } catch {
        if (!cancelled) setStatus({ state: "error" });
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [venueId]);

  if (status.state !== "ready") return null;
  if (status.coupons.length === 0) {
    return emptyMessage ? <p className="text-sm text-muted">{emptyMessage}</p> : null;
  }

  return (
    <div>
      <p className="mb-2.5 text-xs font-extrabold tracking-wide text-muted uppercase">Coupons</p>
      <ul className="flex flex-col gap-2">
        {status.coupons.map((coupon) => (
          <CouponCard key={coupon.id} coupon={coupon} signedIn={status.signedIn} />
        ))}
      </ul>
    </div>
  );
}
