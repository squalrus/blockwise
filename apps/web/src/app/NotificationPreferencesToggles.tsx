"use client";

import { useState } from "react";
import type { AppUser, NotificationPreferences } from "@blockwise/types";
import { getAccessToken, setCachedUser } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";

// BACKLOG.md Ref 102 follow-up: per-category push opt-outs, one toggle per
// key in NotificationPreferences. NotificationToggle (the master browser-
// permission switch, rendered alongside this on /account/settings) has to
// be "on" for any of these to matter, but that's a separate, unrelated
// on/off dimension -- these categories stay visible either way so a user
// can set preferences ahead of enabling push.
const CATEGORIES: { key: keyof NotificationPreferences; label: string; description: string }[] = [
  { key: "checkins", label: "Neighbor check-ins", description: "One of your connections checks in nearby." },
  { key: "connection_requests", label: "Connection requests", description: "Someone wants to connect with you." },
  { key: "connection_accepted", label: "Connection accepted", description: "A request you sent is accepted." },
  { key: "event_reminders", label: "Event reminders", description: "A followed event is starting soon." },
  { key: "new_coupons", label: "New coupons", description: "A venue you favorite launches a coupon." },
];

export function NotificationPreferencesToggles({
  user,
  onSaved,
}: {
  user: AppUser;
  onSaved: (user: AppUser) => void;
}) {
  const [pending, setPending] = useState<keyof NotificationPreferences | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle(key: keyof NotificationPreferences, value: boolean) {
    setPending(key);
    setError(null);

    try {
      const token = await getAccessToken();
      const res = await fetch(clientApiUrl("/me/profile"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ notification_preferences: { [key]: value } }),
      });
      const body = await res.json();

      if (res.ok) {
        setCachedUser(body);
        onSaved(body);
      } else {
        setError(body.error ?? "Failed to save");
      }
    } catch {
      setError("Failed to save");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {CATEGORIES.map(({ key, label, description }) => {
        const enabled = user.notification_preferences[key];
        return (
          <div key={key} className="flex items-center justify-between gap-4 rounded-xl bg-card-alt px-4 py-3 text-sm">
            <div>
              <p className="font-extrabold text-foreground">{label}</p>
              <p className="text-muted">{description}</p>
            </div>
            <button
              type="button"
              disabled={pending === key}
              onClick={() => toggle(key, !enabled)}
              aria-pressed={enabled}
              className={
                enabled
                  ? "shrink-0 rounded-full bg-brand-purple px-3 py-1 text-xs font-bold text-on-accent disabled:opacity-60"
                  : "shrink-0 rounded-full border border-border px-3 py-1 text-xs font-bold text-foreground hover:bg-card disabled:opacity-60"
              }
            >
              {enabled ? "On" : "Off"}
            </button>
          </div>
        );
      })}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
