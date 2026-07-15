import { useEffect, useState } from "react";
import type { LocationsReviewCooldownStatus } from "@blockwise/types";
import { getAccessToken } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";

// Shared by the Locations tab (to show/disable the "Reimport Locations"
// button before the admin even navigates to the review page) and the review
// page itself (BACKLOG.md "Reimport Locations") -- both need the same
// once-per-24h cooldown status, read from a dedicated endpoint that never
// touches Google Places itself.
export function useLocationsReviewCooldown(neighborhoodId: string): LocationsReviewCooldownStatus | null {
  const [status, setStatus] = useState<LocationsReviewCooldownStatus | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const token = await getAccessToken();
      const res = await fetch(
        clientApiUrl(`/neighborhood-admin/neighborhoods/${neighborhoodId}/locations/review/status`),
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (cancelled || !res.ok) return;
      setStatus(await res.json());
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    return () => {
      cancelled = true;
    };
  }, [neighborhoodId]);

  return status;
}

// Rough, human-friendly countdown -- exact-to-the-minute precision isn't
// worth the complexity of a live-updating timer for a 24h window.
export function formatCooldownRemaining(nextAllowedAt: string): string {
  const msRemaining = new Date(nextAllowedAt).getTime() - Date.now();
  if (msRemaining <= 0) return "shortly";

  const hours = Math.ceil(msRemaining / (60 * 60 * 1000));
  if (hours <= 1) return "in about an hour";
  if (hours < 24) return `in about ${hours} hours`;

  const days = Math.ceil(hours / 24);
  return days === 1 ? "in about a day" : `in about ${days} days`;
}
