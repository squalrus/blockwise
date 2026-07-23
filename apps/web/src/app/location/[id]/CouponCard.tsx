"use client";

import { useState } from "react";
import type { CouponWithClaim } from "@blockwise/types";
import { getAccessToken } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";
import { SignInPrompt } from "../../SignInPrompt";
import { SlideToRedeem } from "../../SlideToRedeem";

type ClaimStatus = { state: "idle" } | { state: "claiming" } | { state: "error"; message: string };

// One coupon on the venue page (BACKLOG.md Ref 83) -- renders whichever of
// claim/eligibility/status applies: sign-in prompt, a "you're already here"
// auto-grant confirm, a plain "check in first" nudge, slide-to-redeem for an
// unredeemed claim, or the permanent redeemed timestamp. A ticket-badge
// thumbnail (mirroring EventListItem's calendar-date badge) makes a coupon
// visually distinct from other card types in the same list at a glance.
export function CouponCard({ coupon: initial, signedIn }: { coupon: CouponWithClaim; signedIn: boolean }) {
  const [coupon, setCoupon] = useState(initial);
  const [claimStatus, setClaimStatus] = useState<ClaimStatus>({ state: "idle" });
  const [confirming, setConfirming] = useState(false);

  async function handleClaim() {
    setClaimStatus({ state: "claiming" });
    try {
      const token = await getAccessToken();
      const res = await fetch(clientApiUrl(`/coupons/${coupon.id}/claim`), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      if (res.ok) {
        setCoupon((prev) => ({ ...prev, claim: body, eligible_to_claim: false }));
        setClaimStatus({ state: "idle" });
        setConfirming(false);
      } else {
        setClaimStatus({ state: "error", message: body.error ?? "Failed to claim coupon" });
      }
    } catch {
      setClaimStatus({ state: "error", message: "Failed to claim coupon" });
    }
  }

  function handleRedeemed(redeemedAt: string) {
    setCoupon((prev) => (prev.claim ? { ...prev, claim: { ...prev.claim, redeemed_at: redeemedAt } } : prev));
  }

  const redeemed = Boolean(coupon.claim?.redeemed_at);
  const badgeCaption = redeemed
    ? "used"
    : coupon.status === "ended"
      ? "ended"
      : coupon.status === "upcoming"
        ? "soon"
        : `${coupon.quantity_remaining} left`;
  const badgeColor =
    redeemed || coupon.status === "ended"
      ? "text-muted"
      : coupon.status === "upcoming"
        ? "text-brand-amber"
        : "text-brand-orange";

  return (
    <li className="rounded-2xl bg-card-alt px-3.5 py-3 text-sm">
      <div className="flex items-start gap-3.5">
        <div className="flex w-13 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-border bg-card py-1.5">
          <span className="text-xl leading-none">🎟️</span>
          <span className={`font-mono text-[10px] font-bold ${badgeColor}`}>{badgeCaption}</span>
        </div>
        <div className="min-w-0 flex-1">
          <span className="font-extrabold text-foreground">{coupon.title}</span>
          <p className="mt-1 text-body-text">{coupon.description}</p>
          {coupon.terms && <p className="mt-1 text-xs text-muted">{coupon.terms}</p>}
          <p className="mt-1.5 text-xs font-bold text-muted">
            {coupon.status === "upcoming"
              ? `Starts ${new Date(coupon.start_at).toLocaleString()}`
              : `Ends ${new Date(coupon.end_at).toLocaleString()}`}
          </p>
        </div>
      </div>

      <div className="mt-2.5">
        {!signedIn ? (
          <SignInPrompt message="to claim this coupon." />
        ) : coupon.claim?.redeemed_at ? (
          <p className="text-xs font-extrabold text-brand-green">
            Redeemed {new Date(coupon.claim.redeemed_at).toLocaleString()}
          </p>
        ) : coupon.claim ? (
          <SlideToRedeem claimId={coupon.claim.id} onRedeemed={handleRedeemed} />
        ) : coupon.status !== "active" ? (
          <p className="text-xs text-muted">
            {coupon.status === "upcoming" ? "Not yet available." : "This coupon has ended."}
          </p>
        ) : coupon.eligible_to_claim ? (
          confirming ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground">You&apos;re here — claim this coupon?</span>
              <button
                type="button"
                onClick={handleClaim}
                disabled={claimStatus.state === "claiming"}
                className="rounded-full bg-brand-orange px-3 py-1.5 text-xs font-extrabold text-on-accent disabled:opacity-50"
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="rounded-full border border-border px-3 py-1.5 text-xs font-extrabold text-foreground"
              >
                No
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="rounded-full bg-brand-orange px-4 py-2 text-xs font-extrabold text-on-accent"
            >
              Claim coupon
            </button>
          )
        ) : (
          <p className="text-xs text-muted">Check in at this venue to unlock this coupon.</p>
        )}
        {claimStatus.state === "error" && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{claimStatus.message}</p>
        )}
      </div>
    </li>
  );
}
