"use client";

import { useEffect, useState } from "react";
import type { PushSubscriptionRecord } from "@blockwise/types";
import { getAccessToken } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";

const SUBSCRIPTION_ID_KEY = "blockwise_push_subscription_id";

type State = "checking" | "unsupported" | "ios_not_installed" | "denied" | "off" | "on" | "busy";

function isIos(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
}

function isStandalone(): boolean {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

// pushManager.subscribe() needs the VAPID public key as a Uint8Array, not
// the base64url string it's distributed as.
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

// Subscribe/unsubscribe toggle for web push (BACKLOG.md Ref 89). Lives on
// /account/settings alongside ThemeToggle. iOS only supports Web Push once
// the site is already installed to the home screen and running in
// standalone mode -- Safari refuses the permission prompt from a regular
// browser tab -- so that case steers the user to install first instead of
// showing a toggle that would just fail.
export function NotificationToggle() {
  const [state, setState] = useState<State>("checking");

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setState("unsupported");
        return;
      }
      if (isIos() && !isStandalone()) {
        setState("ios_not_installed");
        return;
      }
      if (Notification.permission === "denied") {
        setState("denied");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (!cancelled) setState(subscription ? "on" : "off");
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    check();
    return () => {
      cancelled = true;
    };
  }, []);

  async function subscribe() {
    setState("busy");

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setState("denied");
      return;
    }

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) {
      setState("off");
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const token = await getAccessToken();
      const res = await fetch(clientApiUrl("/me/push-subscriptions"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!res.ok) throw new Error("subscribe request failed");

      const record: PushSubscriptionRecord = await res.json();
      localStorage.setItem(SUBSCRIPTION_ID_KEY, record.id);
      setState("on");
    } catch {
      setState("off");
    }
  }

  async function unsubscribe() {
    setState("busy");

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      await subscription?.unsubscribe();

      const id = localStorage.getItem(SUBSCRIPTION_ID_KEY);
      if (id) {
        const token = await getAccessToken();
        await fetch(clientApiUrl(`/me/push-subscriptions/${id}`), {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        localStorage.removeItem(SUBSCRIPTION_ID_KEY);
      }
    } finally {
      setState("off");
    }
  }

  if (state === "checking") return null;

  if (state === "unsupported") {
    return <span className="text-muted">Not supported on this browser.</span>;
  }

  if (state === "ios_not_installed") {
    return <span className="text-muted">Install Spored to your home screen first to enable notifications.</span>;
  }

  if (state === "denied") {
    return <span className="text-muted">Blocked -- enable notifications for this site in your browser settings.</span>;
  }

  return (
    <button
      type="button"
      disabled={state === "busy"}
      onClick={state === "on" ? unsubscribe : subscribe}
      aria-pressed={state === "on"}
      className={
        state === "on"
          ? "rounded-full bg-brand-purple px-3 py-1 text-xs font-bold text-on-accent disabled:opacity-60"
          : "rounded-full border border-border px-3 py-1 text-xs font-bold text-foreground hover:bg-card disabled:opacity-60"
      }
    >
      {state === "on" ? "Enabled" : "Enable"}
    </button>
  );
}
