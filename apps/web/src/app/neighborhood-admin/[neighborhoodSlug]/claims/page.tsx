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

  // Un-approves an already-approved claim (BACKLOG.md "POIs and venues
  // managed almost the same") -- the only way to clear claimed_by_business,
  // e.g. before switching that business to POI kind in the Locations tab
  // (which is blocked while claimed).
  async function handleRevoke(claimId: string) {
    if (!window.confirm("Revoke this claim? The business will no longer be marked as claimed.")) return;
    const token = await getAccessToken();
    const res = await fetch(
      clientApiUrl(`/neighborhood-admin/neighborhoods/${neighborhoodId}/claims/${claimId}/revoke`),
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
            className={`rounded-full px-3 py-1 font-bold ${
              status === s ? "bg-brand-purple text-on-accent" : "border-2 border-foreground text-foreground"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {error === "failed" && <p className="text-sm text-red-600 dark:text-red-400">Something went wrong.</p>}

      {claims?.length === 0 && <p className="text-sm text-muted">No {status} claims.</p>}

      <ul className="flex flex-col gap-2">
        {claims?.map((claim) => (
          <li key={claim.id} className="rounded-2xl bg-card-alt px-4 py-3 text-sm">
            <p className="font-extrabold text-foreground">{claim.contact_name}</p>
            <p className="text-muted">
              {claim.contact_method}: {claim.contact_value}
            </p>
            {claim.note && <p className="mt-1 text-muted">{claim.note}</p>}
            <p className="mt-1 text-xs font-bold text-muted">
              Venue: {claim.venue_name} ({claim.venue_address}) · Submitted{" "}
              {new Date(claim.created_at).toLocaleString()}
            </p>
            {claim.status === "pending" && (
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => handleReview(claim.id, "approve")}
                  className="rounded-md bg-brand-green px-3 py-1 text-sm font-bold text-on-accent"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleReview(claim.id, "reject")}
                  className="rounded-md border border-border px-3 py-1 text-sm font-bold text-foreground hover:bg-card"
                >
                  Reject
                </button>
              </div>
            )}
            {claim.status === "approved" && (
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => handleRevoke(claim.id)}
                  className="rounded-md border border-border px-3 py-1 text-sm font-bold text-red-600 hover:bg-card dark:text-red-400"
                >
                  Revoke
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
