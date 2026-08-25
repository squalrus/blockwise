"use client";

import { useState } from "react";
import { getAccessToken } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";

// Local to this modal -- mirrors apps/api/src/pushSubscriptions's
// SendPushSummary shape, not worth sharing via @blockwise/types for one
// admin-only fetch response.
interface SendPushSummary {
  sent: number;
  pruned: number;
  failed: number;
}

type Status =
  | { state: "idle" }
  | { state: "sending" }
  | { state: "done"; summary: SendPushSummary }
  | { state: "error"; message: string };

// Users tab's "Send test push" row action (ActionMenu.tsx), moved out of an
// inline per-row form into a modal so the row stays uncluttered. Targets
// POST /admin/push-subscriptions/test-send (BACKLOG.md Ref 89), which also
// accepts an optional url the client can already exercise; this form just
// didn't have a field for it before.
export function SendTestPushModal({
  userId,
  userLabel,
  onClose,
}: {
  userId: string;
  userLabel: string;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<Status>({ state: "idle" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setStatus({ state: "sending" });

    const token = await getAccessToken();
    const res = await fetch(clientApiUrl("/admin/push-subscriptions/test-send"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ userId, title: title.trim(), body: body.trim(), url: url.trim() || undefined }),
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => null);
      setStatus({ state: "error", message: payload?.error ?? "Failed to send" });
      return;
    }
    setStatus({ state: "done", summary: await res.json() });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-card p-5 text-foreground shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-extrabold">Send test push</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1 text-muted hover:text-foreground"
          >
            ✕
          </button>
        </div>
        <p className="mt-1 truncate text-xs text-muted">To {userLabel}</p>

        <form onSubmit={handleSubmit} className="mt-3.5 flex flex-col gap-2.5">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Notification title"
            className="rounded-lg border border-border bg-card-alt px-2.5 py-1.5 text-[13px] text-foreground"
          />
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Notification body"
            className="rounded-lg border border-border bg-card-alt px-2.5 py-1.5 text-[13px] text-foreground"
          />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="URL to open on tap (optional)"
            className="rounded-lg border border-border bg-card-alt px-2.5 py-1.5 text-[13px] text-foreground"
          />

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={status.state === "sending" || !title.trim() || !body.trim()}
              className="rounded-full bg-brand-purple px-4 py-1.5 text-xs font-bold text-on-accent disabled:opacity-60"
            >
              {status.state === "sending" ? "Sending…" : "Send"}
            </button>
            {status.state === "done" && (
              <span className="text-xs text-muted">
                {status.summary.sent > 0
                  ? `Sent to ${status.summary.sent} device${status.summary.sent === 1 ? "" : "s"}.`
                  : "This user has no active push subscriptions."}
                {status.summary.pruned > 0 && ` (${status.summary.pruned} stale, removed)`}
              </span>
            )}
            {status.state === "error" && (
              <span className="text-xs text-red-600 dark:text-red-400">{status.message}</span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
