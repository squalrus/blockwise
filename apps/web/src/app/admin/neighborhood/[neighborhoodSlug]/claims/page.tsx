"use client";

import { useEffect, useState } from "react";
import type { BusinessClaimStatus, BusinessClaimWithVenue } from "@blockwise/types";
import { getAccessToken } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";
import { MushroomMark, mushroomConfigForUser } from "@blockwise/ui";
import { useNeighborhoodAdmin } from "../NeighborhoodAdminContext";

const STATUSES: BusinessClaimStatus[] = ["pending", "approved", "rejected"];

type ClaimsByStatus = Record<BusinessClaimStatus, BusinessClaimWithVenue[] | null>;

// Business claims tab (docs/url-map.md refactor -- was the global
// admin/claims page, gated only by "admin of some neighborhood" with no
// per-neighborhood filter). Signed-in/forbidden handling lives in
// layout.tsx. Visually redesigned per BACKLOG.md Ref 31 "SimCity-style
// redesign" -- all three statuses are fetched together now so the segmented
// filter can show a real count per status, rather than one status at a time.
export default function NeighborhoodAdminClaimsPage() {
  const { neighborhoodId } = useNeighborhoodAdmin();
  const [status, setStatus] = useState<BusinessClaimStatus>("pending");
  const [claims, setClaims] = useState<ClaimsByStatus>({ pending: null, approved: null, rejected: null });
  const [error, setError] = useState<"failed" | null>(null);

  async function loadAll() {
    setError(null);
    const token = await getAccessToken();
    const results = await Promise.all(
      STATUSES.map((s) =>
        fetch(clientApiUrl(`/neighborhood-admin/neighborhoods/${neighborhoodId}/claims?status=${s}`), {
          headers: { Authorization: `Bearer ${token}` },
        })
      )
    );
    if (results.some((r) => !r.ok)) {
      setError("failed");
      return;
    }
    const [pending, approved, rejected] = await Promise.all(results.map((r) => r.json()));
    setClaims({ pending, approved, rejected });
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [neighborhoodId]);

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
    await loadAll();
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
    await loadAll();
  }

  const activeClaims = claims[status];

  return (
    <div className="flex max-w-[820px] flex-col gap-5">
      <div>
        <h1 className="font-heading text-4xl font-extrabold">Business claims</h1>
        <p className="mt-1 text-[15px] text-body-text">
          Owners asking to run their venue&apos;s page. Approving hands them the keys to hours, photos, and posts.
        </p>
      </div>

      <div className="flex gap-2">
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={`flex items-center gap-1.5 rounded-full px-4.5 py-2 text-[13.5px] font-extrabold capitalize ${
              status === s ? "bg-foreground text-background" : "border border-border bg-card text-muted-strong"
            }`}
          >
            {s}
            <span className="font-mono text-[10px] opacity-70">{claims[s]?.length ?? "…"}</span>
          </button>
        ))}
      </div>

      {error === "failed" && <p className="text-sm text-red-600 dark:text-red-400">Something went wrong.</p>}

      <div className="flex flex-col gap-3">
        {activeClaims?.length === 0 && (
          <div className="rounded-2xl border-1.5 border-dashed border-border px-9 py-9 text-center text-sm text-muted">
            Nothing here — all quiet on this shelf.
          </div>
        )}

        {activeClaims?.map((claim) => {
          const mushroom = mushroomConfigForUser(claim.claimed_by_user_id);
          return (
            <div key={claim.id} className="flex items-start gap-4 rounded-2xl border border-border bg-card px-5 py-4.5">
              <MushroomMark
                size={42}
                cap={mushroom.cap}
                stalk={mushroom.stalk}
                spots={mushroom.spots}
                spotCount={mushroom.spotCount}
                spotShape={mushroom.spotShape}
                bg={mushroom.bg}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="font-heading text-[17px] font-bold">{claim.contact_name}</span>
                  <span className="font-mono text-[11px] text-muted">
                    {claim.contact_method}: {claim.contact_value}
                  </span>
                </div>
                <div className="mt-1.5 text-[13.5px]">
                  wants to claim <span className="font-extrabold">{claim.venue_name}</span>{" "}
                  <span className="text-muted">· {claim.venue_address}</span>
                </div>
                <div className="mt-1 text-[12.5px] text-muted">
                  account:{" "}
                  <span className="font-bold text-muted-strong">
                    {claim.claimant_display_name ?? claim.claimant_username ?? "unnamed"}
                  </span>
                  {claim.claimant_username && ` (@${claim.claimant_username})`}
                  {claim.claimant_email && ` · ${claim.claimant_email}`}
                </div>
                {claim.note && <p className="mt-1 text-[13.5px] text-muted">{claim.note}</p>}
                <div className="mt-1.5 font-mono text-[11px] text-muted">
                  submitted {new Date(claim.created_at).toLocaleString()}
                  {claim.reviewed_at && ` · reviewed ${new Date(claim.reviewed_at).toLocaleString()}`}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {claim.status === "pending" && (
                  <>
                    <button
                      onClick={() => handleReview(claim.id, "reject")}
                      className="rounded-xl border-1.5 border-red-300 px-4 py-2 text-[13px] font-bold text-red-600 dark:border-red-900 dark:text-red-400"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleReview(claim.id, "approve")}
                      className="rounded-xl bg-brand-green px-4.5 py-2 text-[13px] font-bold text-on-accent"
                    >
                      Approve
                    </button>
                  </>
                )}
                {claim.status === "approved" && (
                  <button
                    onClick={() => handleRevoke(claim.id)}
                    className="rounded-xl border-1.5 border-red-300 px-4 py-2 text-[13px] font-bold text-red-600 dark:border-red-900 dark:text-red-400"
                  >
                    Revoke
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
