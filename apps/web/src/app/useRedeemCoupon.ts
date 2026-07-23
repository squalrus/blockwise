"use client";

import { useState } from "react";
import { getAccessToken } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";

export type RedeemStatus =
  | { state: "idle" }
  | { state: "redeeming" }
  | { state: "success"; redeemedAt: string }
  | { state: "error"; message: string };

// Slide-to-redeem network logic (BACKLOG.md Ref 83/20) -- the in-person,
// staff-witnessed counterpart to useCheckIn's GPS-verified slide gesture.
export function useRedeemCoupon(claimId: string) {
  const [status, setStatus] = useState<RedeemStatus>({ state: "idle" });

  async function redeem() {
    setStatus({ state: "redeeming" });
    try {
      const token = await getAccessToken();
      const res = await fetch(clientApiUrl(`/coupons/claims/${claimId}/redeem`), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json();

      if (res.ok && body.redeemed_at) {
        setStatus({ state: "success", redeemedAt: body.redeemed_at });
      } else {
        setStatus({ state: "error", message: body.error ?? "Redemption failed" });
      }
    } catch {
      setStatus({ state: "error", message: "Redemption failed" });
    }
  }

  function reset() {
    setStatus({ state: "idle" });
  }

  return { status, redeem, reset };
}
