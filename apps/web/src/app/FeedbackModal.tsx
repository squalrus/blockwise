"use client";

import { useState } from "react";
import type { FeedbackType } from "@blockwise/types";
import { getAccessToken } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";

type Status = { state: "idle" } | { state: "saving" } | { state: "sent" } | { state: "error"; message: string };

// BETA-prep: lightweight bug report/feature request form, reachable from
// AccountMenu's "Send feedback" item on every signed-in page (main nav and
// both admin sidebar shells) -- a modal rather than its own route, so it's
// available without navigating away from whatever prompted the report.
export function FeedbackModal({ onClose }: { onClose: () => void }) {
  const [type, setType] = useState<FeedbackType>("bug");
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<Status>({ state: "idle" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim()) return;

    setStatus({ state: "saving" });
    try {
      const token = await getAccessToken();
      const res = await fetch(clientApiUrl("/me/feedback"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type, comment }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Couldn't send that -- try again.");
      }
      setStatus({ state: "sent" });
    } catch (err) {
      setStatus({ state: "error", message: err instanceof Error ? err.message : "Couldn't send that -- try again." });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-card p-5 text-foreground shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {status.state === "sent" ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <span className="text-3xl">🍄</span>
            <p className="font-heading text-lg font-extrabold">Thanks for the feedback!</p>
            <p className="text-sm text-muted">We read every submission -- it helps shape what grows next.</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 rounded-full bg-foreground px-4 py-2 text-sm font-extrabold text-on-accent"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-lg font-extrabold">Send feedback</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="rounded-full p-1 text-muted hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <div className="flex gap-2 text-sm">
              {(["bug", "feature"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`rounded-full px-3.5 py-1.5 font-extrabold ${
                    type === t ? "bg-foreground text-on-accent" : "bg-card-alt text-muted"
                  }`}
                >
                  {t === "bug" ? "Bug report" : "Feature idea"}
                </button>
              ))}
            </div>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={
                type === "bug"
                  ? "What happened? What did you expect instead?"
                  : "What would you like to see added or changed?"
              }
              rows={5}
              maxLength={2000}
              className="resize-none rounded-xl bg-card-alt px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted"
            />

            {status.state === "error" && <p className="text-sm text-red-600 dark:text-red-400">{status.message}</p>}

            <button
              type="submit"
              disabled={status.state === "saving" || !comment.trim()}
              className="rounded-full bg-brand-purple px-4 py-2.5 text-sm font-extrabold text-on-accent disabled:opacity-50"
            >
              {status.state === "saving" ? "Sending…" : "Submit"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
