"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import type { ConnectionSummary } from "@blockwise/types";
import { getAccessToken } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";
import { Avatar } from "../Avatar";

// BACKLOG.md Ref 14/33 "Connect with other users" / "Friends/neighbors on
// profile": account page section for the mutual, request-based "neighbor"
// relationship (neighborhood-flavored language instead of "friend"). Add by
// username, accept/decline incoming requests, cancel outgoing ones, remove
// an existing connection. `connections`/`onChange` are lifted to AccountPage
// (mirroring how favorites/checkins/badges are all fetched centrally there)
// rather than this component fetching its own copy.
export function NeighborsSection({
  connections,
  onChange,
}: {
  connections: ConnectionSummary[];
  onChange: () => Promise<void>;
}) {
  const [usernameInput, setUsernameInput] = useState("");
  const [addStatus, setAddStatus] = useState<
    { state: "idle" } | { state: "saving" } | { state: "error"; message: string }
  >({ state: "idle" });
  const [actionError, setActionError] = useState<string | null>(null);

  async function addNeighbor(e: React.FormEvent) {
    e.preventDefault();
    const username = usernameInput.trim().toLowerCase();
    if (!username) return;

    setAddStatus({ state: "saving" });
    // The request itself succeeding and the subsequent reload succeeding are
    // two separate things -- if onChange() throws (a transient blip across
    // AccountPage's own parallel fetches), that must not be reported as "the
    // request didn't go through" when it actually did.
    try {
      const token = await getAccessToken();
      const res = await fetch(clientApiUrl("/me/connections"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ username }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Couldn't send request");
      }
    } catch (err) {
      setAddStatus({ state: "error", message: err instanceof Error ? err.message : "Couldn't send request" });
      return;
    }

    setUsernameInput("");
    setAddStatus({ state: "idle" });
    try {
      await onChange();
    } catch {
      // Request already succeeded -- a reload hiccup here isn't a failure to
      // report, the list will catch up on the next successful reload.
    }
  }

  async function respond(id: string, action: "accept" | "remove") {
    setActionError(null);
    // Same split as addNeighbor above -- don't let a reload failure after a
    // successful accept/decline/cancel/remove read as the action itself
    // having failed.
    try {
      const token = await getAccessToken();
      const res = await fetch(
        clientApiUrl(action === "accept" ? `/me/connections/${id}/accept` : `/me/connections/${id}`),
        { method: action === "accept" ? "POST" : "DELETE", headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error();
    } catch {
      setActionError("That didn't go through -- try again.");
      return;
    }

    try {
      await onChange();
    } catch {
      // Request already succeeded -- see addNeighbor's comment above.
    }
  }

  const accepted = connections.filter((c) => c.status === "accepted");
  const incoming = connections.filter((c) => c.status === "pending" && c.direction === "incoming");
  const outgoing = connections.filter((c) => c.status === "pending" && c.direction === "outgoing");

  return (
    <section className="flex flex-col gap-2.5">
      <form onSubmit={addNeighbor} className="flex gap-2">
        <input
          type="text"
          value={usernameInput}
          onChange={(e) => setUsernameInput(e.target.value)}
          placeholder="Add a neighbor by username"
          className="flex-1 rounded-xl bg-card-alt px-3.5 py-2 text-sm text-foreground placeholder:text-muted"
        />
        <button
          type="submit"
          disabled={addStatus.state === "saving"}
          className="rounded-xl bg-brand-purple px-3.5 py-2 text-sm font-extrabold text-on-accent disabled:opacity-50"
        >
          Add
        </button>
      </form>
      {addStatus.state === "error" && (
        <p className="text-sm text-red-600 dark:text-red-400">{addStatus.message}</p>
      )}
      {actionError && <p className="text-sm text-red-600 dark:text-red-400">{actionError}</p>}

      {incoming.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-extrabold tracking-wide text-muted uppercase">Requests</p>
          {incoming.map((c) => (
            <ConnectionRow key={c.id} connection={c}>
              <button
                onClick={() => respond(c.id, "accept")}
                className="rounded-full bg-brand-green px-3 py-1.5 text-xs font-extrabold text-on-accent"
              >
                Accept
              </button>
              <button
                onClick={() => respond(c.id, "remove")}
                className="rounded-full border-2 border-foreground px-3 py-1.5 text-xs font-extrabold text-foreground"
              >
                Decline
              </button>
            </ConnectionRow>
          ))}
        </div>
      )}

      {outgoing.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-extrabold tracking-wide text-muted uppercase">Sent</p>
          {outgoing.map((c) => (
            <ConnectionRow key={c.id} connection={c}>
              <span className="text-xs font-bold text-muted">Pending</span>
              <button
                onClick={() => respond(c.id, "remove")}
                className="rounded-full border-2 border-foreground px-3 py-1.5 text-xs font-extrabold text-foreground"
              >
                Cancel
              </button>
            </ConnectionRow>
          ))}
        </div>
      )}

      {accepted.length === 0 ? (
        <p className="text-sm text-muted">No neighbors yet -- add one by username above.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {accepted.map((c) => (
            <li key={c.id}>
              <ConnectionRow connection={c}>
                <button
                  onClick={() => respond(c.id, "remove")}
                  className="rounded-full border-2 border-foreground px-3 py-1.5 text-xs font-extrabold text-foreground"
                >
                  Remove
                </button>
              </ConnectionRow>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ConnectionRow({ connection, children }: { connection: ConnectionSummary; children: ReactNode }) {
  const label = connection.user.display_name ?? connection.user.username ?? "A user";
  const inner = (
    <>
      <Avatar
        avatarUrl={connection.user.avatar_url}
        avatarStyle={connection.user.avatar_style}
        mushroomCustomization={connection.user.mushroom_customization}
        seed={connection.user.id}
        label={label}
        size={40}
      />
      <span className="font-extrabold text-foreground">{label}</span>
    </>
  );

  return (
    <div className="flex items-center justify-between gap-2 rounded-2xl bg-card-alt px-4 py-3 text-sm">
      {connection.user.username ? (
        <Link href={`/profile/${connection.user.username}`} className="flex items-center gap-3">
          {inner}
        </Link>
      ) : (
        <div className="flex items-center gap-3">{inner}</div>
      )}
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </div>
  );
}
