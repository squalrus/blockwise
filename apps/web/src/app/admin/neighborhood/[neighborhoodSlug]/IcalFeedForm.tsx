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
  onSynced,
}: {
  neighborhoodId: string;
  initialFeedUrl: string | null;
  initialSyncedAt: string | null;
  onSynced: () => void;
}) {
  const [feedUrl, setFeedUrl] = useState(initialFeedUrl ?? "");
  const [syncedAt, setSyncedAt] = useState(initialSyncedAt);
  const [status, setStatus] = useState<Status>({ state: "idle" });

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
    </form>
  );
}
