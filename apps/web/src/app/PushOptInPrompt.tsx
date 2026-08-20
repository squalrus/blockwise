"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import { checkPushEligibility, subscribeToPush } from "./NotificationToggle";

const DISMISSED_KEY = "blockwise_push_dismissed";

// Proactive nudge to enable web push (BACKLOG.md Ref 99), parallel to
// InstallPrompt.tsx's PWA-install nudge -- NotificationToggle.tsx's own
// toggle is opt-in only via someone finding /account/settings on their own.
// Reuses NotificationToggle's eligibility check and subscribe flow rather
// than a second copy of either. Only shown for signed-in users (subscribing
// persists to /me/push-subscriptions, which needs an account) whose
// eligibility comes back "off" -- every other Eligibility value ("denied",
// "unsupported", or iOS before it's installed to the home screen) has
// nothing this banner could usefully offer, and "ios_not_installed" in
// particular is already covered by InstallPrompt's own banner, so this one
// stays quiet there instead of stacking a second banner on the same cause.
export function PushOptInPrompt() {
  const [eligible, setEligible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (localStorage.getItem(DISMISSED_KEY) === "1") return;

    let cancelled = false;
    async function check() {
      const user = await getCurrentUser();
      if (!user || cancelled) return;

      const result = await checkPushEligibility();
      if (!cancelled && result === "off") {
        setEligible(true);
        setDismissed(false);
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
  }

  async function enable() {
    setBusy(true);
    await subscribeToPush();
    setBusy(false);
    // Whether it succeeded or the user declined the permission prompt,
    // there's nothing more this banner can do -- don't keep nagging either
    // way. NotificationToggle on /account/settings remains available to
    // retry later.
    dismiss();
  }

  if (dismissed || !eligible) return null;

  return (
    <div className="flex items-center justify-between gap-3 bg-brand-purple px-4 py-2.5 text-sm text-on-accent">
      <span className="font-bold">Turn on notifications for check-ins, connections, and events near you.</span>
      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          onClick={enable}
          disabled={busy}
          className="rounded-full bg-on-accent px-3 py-1 text-xs font-bold text-brand-purple disabled:opacity-60"
        >
          Enable
        </button>
        <button type="button" onClick={dismiss} aria-label="Dismiss" className="text-on-accent/80 hover:text-on-accent">
          ✕
        </button>
      </div>
    </div>
  );
}
