"use client";

import { useEffect, useState } from "react";
import type { BusinessClaimStatus, BusinessClaimWithVenue } from "@blockwise/types";
import { getAccessToken } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";
import { useNeighborhoodAdmin } from "../NeighborhoodAdminContext";

// Business claims tab (docs/url-map.md refactor -- was the global
// admin/claims page, gated only by "admin of some neighborhood" with no
// per-neighborhood filter). Signed-in/forbidden handling lives in
// layout.tsx; this only tracks the pending/approved/rejected filter and the
// claims list itself.
export default function NeighborhoodAdminClaimsPage() {
  const { neighborhoodId } = useNeighborhoodAdmin();
  const [status, setStatus] = useState<BusinessClaimStatus>("pending");
  const [claims, setClaims] = useState<BusinessClaimWithVenue[] | null>(null);
  const [error, setError] = useState<"failed" | null>(null);

  async function loadClaims(activeStatus: BusinessClaimStatus) {
    setError(null);
    const token = await getAccessToken();
    const res = await fetch(
      clientApiUrl(`/neighborhood-admin/neighborhoods/${neighborhoodId}/claims?status=${activeStatus}`),
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) {
      setError("failed");
      return;
    }
    setClaims(await res.json());
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadClaims(status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [neighborhoodId, status]);

  async function handleReview(claimId: string, decision: "approve" | "reject") {
    const token = await getAccessToken();
    const res = await fetch(
      clientApiUrl(`/neighborhood-admin/neighborhoods/${neighborhoodId}/claims/${claimId}/${decision}`),
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      }
    );
    if (!res.ok) {
      setError("failed");
      return;
    }
    await loadClaims(status);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 text-sm">
        {(["pending", "approved", "rejected"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`rounded-md px-3 py-1 ${
              status === s
                ? "bg-black text-white dark:bg-white dark:text-black"
                : "border border-black/[.08] text-black dark:border-white/[.145] dark:text-zinc-50"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {error === "failed" && <p className="text-sm text-red-600 dark:text-red-400">Something went wrong.</p>}

      {claims?.length === 0 && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">No {status} claims.</p>
      )}

      <ul className="flex flex-col gap-2">
        {claims?.map((claim) => (
          <li
            key={claim.id}
            className="rounded-lg border border-black/[.08] px-4 py-3 text-sm dark:border-white/[.145]"
          >
            <p className="font-medium text-black dark:text-zinc-50">{claim.contact_name}</p>
            <p className="text-zinc-600 dark:text-zinc-400">
              {claim.contact_method}: {claim.contact_value}
            </p>
            {claim.note && <p className="mt-1 text-zinc-600 dark:text-zinc-400">{claim.note}</p>}
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
              Venue: {claim.venue_name} ({claim.venue_address}) · Submitted{" "}
              {new Date(claim.created_at).toLocaleString()}
            </p>
            {claim.status === "pending" && (
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => handleReview(claim.id, "approve")}
                  className="rounded-md bg-black px-3 py-1 text-white dark:bg-white dark:text-black"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleReview(claim.id, "reject")}
                  className="rounded-md border border-black/[.08] px-3 py-1 text-black dark:border-white/[.145] dark:text-zinc-50"
                >
                  Reject
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
