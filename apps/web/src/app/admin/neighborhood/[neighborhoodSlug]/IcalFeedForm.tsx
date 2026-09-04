"use client";

import { useState } from "react";
import { getAccessToken } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";

type Status = { state: "idle" | "saving" | "syncing" | "error"; message?: string };

// Venue-scoped counterpart: admin/business/[venueId]/IcalFeedForm.tsx.
// BACKLOG.md Ref 30 -- lets a neighborhood publish an external iCal/webcal
// calendar feed URL, then manually trigger a sync that upserts its events
// into the neighborhood's events list (EventForm above stays the fallback
// for neighborhoods without a feed).
export function IcalFeedForm({
  neighborhoodId,
  initialFeedUrl,
  initialSyncedAt,
  initialAutoSyncEnabled,
  initialAutoApproveEvents,
  onSynced,
}: {
  neighborhoodId: string;
  initialFeedUrl: string | null;
  initialSyncedAt: string | null;
  initialAutoSyncEnabled: boolean;
  initialAutoApproveEvents: boolean;
  onSynced: () => void;
}) {
  const [feedUrl, setFeedUrl] = useState(initialFeedUrl ?? "");
  const [syncedAt, setSyncedAt] = useState(initialSyncedAt);
  const [status, setStatus] = useState<Status>({ state: "idle" });
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(initialAutoSyncEnabled);
  const [autoApproveEvents, setAutoApproveEvents] = useState(initialAutoApproveEvents);
  const [savingSetting, setSavingSetting] = useState<"auto_sync" | "auto_approve" | null>(null);

  async function toggleSetting(key: "ical_auto_sync_enabled" | "ical_auto_approve_events", value: boolean) {
    const which = key === "ical_auto_sync_enabled" ? "auto_sync" : "auto_approve";
    setSavingSetting(which);
    try {
      const token = await getAccessToken();
      const res = await fetch(clientApiUrl(`/neighborhood-admin/neighborhoods/${neighborhoodId}/ical-sync-settings`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ [key]: value }),
      });
      if (!res.ok) return;
      if (key === "ical_auto_sync_enabled") setAutoSyncEnabled(value);
      else setAutoApproveEvents(value);
    } finally {
      setSavingSetting(null);
    }
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus({ state: "saving" });

    try {
      const token = await getAccessToken();
      const res = await fetch(
        clientApiUrl(`/neighborhood-admin/neighborhoods/${neighborhoodId}/ical-feed`),
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ ical_feed_url: feedUrl.trim() }),
        }
      );
      const body = await res.json();

      if (res.ok) {
        setFeedUrl(body.ical_feed_url ?? "");
        setStatus({ state: "idle" });
      } else {
        setStatus({ state: "error", message: body.error ?? "Failed to save feed URL" });
      }
    } catch {
      setStatus({ state: "error", message: "Failed to save feed URL" });
    }
  }

  async function handleSync() {
    setStatus({ state: "syncing" });

    try {
      const token = await getAccessToken();
      const res = await fetch(
        clientApiUrl(`/neighborhood-admin/neighborhoods/${neighborhoodId}/ical-feed/sync`),
        { method: "POST", headers: { Authorization: `Bearer ${token}` } }
      );
      const body = await res.json();

      if (res.ok) {
        setSyncedAt(body.synced_at ?? null);
        setStatus({ state: "idle", message: `Imported ${body.imported}, updated ${body.updated}.` });
        onSynced();
      } else {
        setStatus({ state: "error", message: body.error ?? "Sync failed" });
      }
    } catch {
      setStatus({ state: "error", message: "Sync failed" });
    }
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-2.5">
      <label className="flex flex-col gap-1 text-xs font-extrabold text-muted-strong">
        Calendar feed URL (iCal / webcal)
        <input
          type="text"
          value={feedUrl}
          onChange={(e) => setFeedUrl(e.target.value)}
          placeholder="webcal://example.com/events.ics"
          className="rounded-lg border border-border bg-card-alt px-3 py-2.5 text-[13px] font-normal text-foreground"
        />
      </label>
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="submit"
          disabled={status.state === "saving"}
          className="rounded-xl bg-brand-purple px-5 py-2.5 font-heading text-sm font-bold text-on-accent disabled:opacity-50"
        >
          {status.state === "saving" ? "Saving…" : "Save feed URL"}
        </button>
        <button
          type="button"
          onClick={handleSync}
          disabled={status.state === "syncing" || !feedUrl.trim()}
          className="rounded-xl border border-border px-5 py-2.5 font-heading text-sm font-bold text-foreground disabled:opacity-50"
        >
          {status.state === "syncing" ? "Syncing…" : "Sync now"}
        </button>
        {syncedAt && (
          <span className="font-mono text-[11px] text-muted">
            Last synced {new Date(syncedAt).toLocaleString()}
          </span>
        )}
      </div>
      {status.state === "error" ? (
        <p className="text-sm text-red-600 dark:text-red-400">{status.message}</p>
      ) : (
        status.message && <p className="text-sm text-muted">{status.message}</p>
      )}

      {feedUrl.trim() && (
        <div className="mt-1 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-4 rounded-xl bg-card-alt px-4 py-3 text-sm">
            <div>
              <p className="font-extrabold text-foreground">Auto-sync nightly</p>
              <p className="text-muted">Sync this feed automatically every night instead of clicking Sync now.</p>
            </div>
            <button
              type="button"
              disabled={savingSetting === "auto_sync"}
              onClick={() => toggleSetting("ical_auto_sync_enabled", !autoSyncEnabled)}
              aria-pressed={autoSyncEnabled}
              className={
                autoSyncEnabled
                  ? "shrink-0 rounded-full bg-brand-purple px-3 py-1 text-xs font-bold text-on-accent disabled:opacity-60"
                  : "shrink-0 rounded-full border border-border px-3 py-1 text-xs font-bold text-foreground hover:bg-card disabled:opacity-60"
              }
            >
              {autoSyncEnabled ? "On" : "Off"}
            </button>
          </div>
          <div className="flex items-center justify-between gap-4 rounded-xl bg-card-alt px-4 py-3 text-sm">
            <div>
              <p className="font-extrabold text-foreground">Auto-approve imported events</p>
              <p className="text-muted">
                Skip the pending review queue for this feed -- imported events publish immediately instead of
                waiting for you to approve or hide them.
              </p>
            </div>
            <button
              type="button"
              disabled={savingSetting === "auto_approve"}
              onClick={() => toggleSetting("ical_auto_approve_events", !autoApproveEvents)}
              aria-pressed={autoApproveEvents}
              className={
                autoApproveEvents
                  ? "shrink-0 rounded-full bg-brand-purple px-3 py-1 text-xs font-bold text-on-accent disabled:opacity-60"
                  : "shrink-0 rounded-full border border-border px-3 py-1 text-xs font-bold text-foreground hover:bg-card disabled:opacity-60"
              }
            >
              {autoApproveEvents ? "On" : "Off"}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
