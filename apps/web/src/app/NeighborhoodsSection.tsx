"use client";

import { useEffect, useState } from "react";
import type { NeighborhoodSummary } from "@blockwise/types";
import { getAccessToken, getCurrentUser } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; signedIn: boolean; neighborhoods: NeighborhoodSummary[] };

// Landing page (BACKLOG.md "Neighborhoods on landing page and user
// profile"): browse every active neighborhood and join/leave in place. A
// client component (unlike the rest of page.tsx) because join/leave needs
// the browser-held Supabase session (lib/auth.ts has no server-side
// counterpart) and per-row pending state for the button.
export function NeighborhoodsSection() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const token = await getAccessToken();
      const [user, res] = await Promise.all([
        getCurrentUser(),
        fetch(clientApiUrl("/neighborhoods"), {
          cache: "no-store",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        }),
      ]);
      if (cancelled) return;
      if (!res.ok) {
        setState({ status: "error", message: "Failed to load neighborhoods" });
        return;
      }
      setState({ status: "ready", signedIn: user !== null, neighborhoods: await res.json() });
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function toggleJoined(neighborhood: NeighborhoodSummary) {
    if (state.status !== "ready") return;
    setPendingId(neighborhood.id);

    try {
      const token = await getAccessToken();
      const res = await fetch(clientApiUrl(`/neighborhoods/${neighborhood.id}/join`), {
        method: neighborhood.joined ? "DELETE" : "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;

      setState({
        status: "ready",
        signedIn: state.signedIn,
        neighborhoods: state.neighborhoods.map((n) =>
          n.id === neighborhood.id ? { ...n, joined: !n.joined } : n
        ),
      });
    } finally {
      setPendingId(null);
    }
  }

  if (state.status === "loading") {
    return <p className="text-sm text-muted">Loading neighborhoods…</p>;
  }
  if (state.status === "error") {
    return <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>;
  }

  const joined = state.neighborhoods.filter((n) => n.joined);

  return (
    <div className="flex w-full max-w-2xl flex-col gap-6">
      {joined.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <h2 className="text-xs font-extrabold tracking-wide text-muted uppercase">Your neighborhoods</h2>
          <ul className="flex flex-col gap-2">
            {joined.map((n) => (
              <li key={n.id} className="rounded-2xl bg-card-alt px-4 py-3 text-sm">
                <a href={`/neighborhoods/${n.slug}`} className="font-extrabold text-foreground hover:text-brand-purple">
                  {n.name}
                </a>
                <p className="text-muted">
                  {n.city}, {n.state}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-2.5">
        <h2 className="text-xs font-extrabold tracking-wide text-muted uppercase">All neighborhoods</h2>
        {state.neighborhoods.length === 0 ? (
          <p className="text-sm text-muted">No neighborhoods yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {state.neighborhoods.map((n) => (
              <li
                key={n.id}
                className="flex items-center justify-between gap-4 rounded-2xl bg-card-alt px-4 py-3 text-sm"
              >
                <div>
                  <a href={`/neighborhoods/${n.slug}`} className="font-extrabold text-foreground hover:text-brand-purple">
                    {n.name}
                  </a>
                  <p className="text-muted">
                    {n.city}, {n.state}
                  </p>
                </div>
                {state.signedIn ? (
                  <button
                    onClick={() => toggleJoined(n)}
                    disabled={pendingId === n.id}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-extrabold disabled:opacity-50 ${
                      n.joined ? "bg-brand-green text-on-accent" : "border-2 border-foreground text-foreground"
                    }`}
                  >
                    {n.joined ? "✓ Joined" : "Join"}
                  </button>
                ) : (
                  <a
                    href="/login"
                    className="shrink-0 rounded-full border-2 border-foreground px-3 py-1.5 text-xs font-extrabold text-foreground"
                  >
                    Log in to join
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
