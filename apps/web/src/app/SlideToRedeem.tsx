"use client";

import { useEffect } from "react";
import { SlideTrack } from "./SlideTrack";
import { useRedeemCoupon } from "./useRedeemCoupon";

// In-person, staff-witnessed redemption gesture (BACKLOG.md Ref 83/20) --
// drag the thumb across the track while showing the venue staff your phone,
// sharing its drag mechanics and personalized mushroom-avatar thumb with
// SlideToCheckIn via SlideTrack. Simpler than that control: there's no
// GPS/geofence step (presence was already proven to unlock the claim) and no
// reward payload to reveal, so success/failure stay flat instead of flipping
// to a result card -- a label change on success, a full-width "tap to retry"
// button on failure.
export function SlideToRedeem({
  claimId,
  onRedeemed,
}: {
  claimId: string;
  onRedeemed: (redeemedAt: string) => void;
}) {
  const { status, redeem, reset } = useRedeemCoupon(claimId);

  useEffect(() => {
    if (status.state === "success") onRedeemed(status.redeemedAt);
    // onRedeemed intentionally excluded -- callers pass a fresh closure each
    // render, and only a transition into "success" should fire this once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  if (status.state === "error") {
    return (
      <button
        type="button"
        onClick={reset}
        className="flex w-full flex-col items-center gap-1 rounded-3xl bg-nav px-5 py-4 text-center"
      >
        <span className="text-sm font-extrabold text-nav-muted">Redemption didn&apos;t go through</span>
        <span className="text-xs text-nav-muted">{status.message}</span>
        <span className="mt-0.5 text-[11px] font-extrabold text-brand-orange">Tap to try again</span>
      </button>
    );
  }

  const locked = status.state === "redeeming" || status.state === "success";
  const label =
    status.state === "redeeming"
      ? "Redeeming…"
      : status.state === "success"
        ? "Redeemed ✓"
        : "Show staff, then slide to redeem →";

  return (
    <SlideTrack
      label={label}
      locked={locked}
      parkedAtEnd={status.state === "success"}
      snapBack={false}
      onComplete={redeem}
    />
  );
}
