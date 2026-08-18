"use client";

import { useState } from "react";
import type { NeighborhoodMembership } from "@blockwise/types";
import { getAccessToken } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";

type Status = { state: "idle" } | { state: "saving" } | { state: "error"; message: string };

// Shared "report a missing venue" form (BACKLOG.md Ref 80/96) -- posts a
// "missing_venue"-type feedback submission (POST /me/feedback), routed to
// the reported neighborhood's own admins rather than super admins. Used both
// inside FeedbackModal (Send feedback menu) and inline at the bottom of the
// /checkin page's NearestVenues list -- callers own the surrounding chrome
// (modal panel vs. expand-in-place row) and what happens after a successful
// submit (onSent), so this component only owns the fields and the POST
// itself, not a "sent" confirmation state.
export function MissingVenueReportForm({
  neighborhoods,
  defaultNeighborhoodId,
  surface = "inline",
  onSent,
}: {
  neighborhoods: NeighborhoodMembership[];
  defaultNeighborhoodId: string | null;
  // "modal" sits on FeedbackModal's bg-card panel, "inline" sits on a
  // bg-card-alt row (checkin's MissingVenueRow) -- each needs the opposite
  // field background for contrast.
  surface?: "modal" | "inline";
  onSent: () => void;
}) {
  const [venueName, setVenueName] = useState("");
  const [neighborhoodId, setNeighborhoodId] = useState(
    defaultNeighborhoodId ?? neighborhoods[0]?.neighborhood_id ?? ""
  );
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<Status>({ state: "idle" });

  const fieldBg = surface === "modal" ? "bg-card-alt" : "bg-card";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!venueName.trim() || !neighborhoodId) return;

    setStatus({ state: "saving" });
    try {
      const token = await getAccessToken();
      const res = await fetch(clientApiUrl("/me/feedback"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          type: "missing_venue",
          venue_name: venueName.trim(),
          neighborhood_id: neighborhoodId,
          comment: notes,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Couldn't send that -- try again.");
      }
      onSent();
    } catch (err) {
      setStatus({ state: "error", message: err instanceof Error ? err.message : "Couldn't send that -- try again." });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
      <input
        value={venueName}
        onChange={(e) => setVenueName(e.target.value)}
        placeholder="Venue name"
        maxLength={200}
        className={`rounded-xl ${fieldBg} px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted`}
      />

      {neighborhoods.length > 1 ? (
        <select
          value={neighborhoodId}
          onChange={(e) => setNeighborhoodId(e.target.value)}
          className={`rounded-xl ${fieldBg} px-3.5 py-2.5 text-sm text-foreground`}
        >
          {neighborhoods.map((n) => (
            <option key={n.neighborhood_id} value={n.neighborhood_id}>
              {n.name}
            </option>
          ))}
        </select>
      ) : (
        neighborhoods[0] && <p className="text-xs font-bold text-muted">Neighborhood: {neighborhoods[0].name}</p>
      )}

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Anything that'd help admins find it -- address, cross street, etc. (optional)"
        rows={2}
        maxLength={2000}
        className={`resize-none rounded-xl ${fieldBg} px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted`}
      />

      {status.state === "error" && <p className="text-sm text-red-600 dark:text-red-400">{status.message}</p>}

      <button
        type="submit"
        disabled={status.state === "saving" || !venueName.trim() || !neighborhoodId}
        className="self-start rounded-full bg-brand-purple px-4 py-2 text-sm font-extrabold text-on-accent disabled:opacity-50"
      >
        {status.state === "saving" ? "Sending…" : "Report missing venue"}
      </button>
    </form>
  );
}
