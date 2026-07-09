"use client";

import { useEffect, useState } from "react";
import type { NeighborhoodSummary } from "@blockwise/types";
import { getAccessToken, getCurrentUser } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";

function matchesSearch(n: NeighborhoodSummary, query: string): boolean {
  const haystack = `${n.name} ${n.city} ${n.state}`.toLowerCase();
  return haystack.includes(query.toLowerCase());
}

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; signedIn: boolean; neighborhoods: NeighborhoodSummary[] };

// /neighborhoods index (split out from the landing page; BACKLOG.md
// "Neighborhoods on landing page and user profile"): browse every active
// neighborhood and join/leave in place. A client component (unlike the rest
// of page.tsx) because join/leave needs the browser-held Supabase session
// (lib/auth.ts has no server-side counterpart) and per-row pending state for
// the button.
export function NeighborhoodsSection() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

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
  const filteredJoined = joined.filter((n) => matchesSearch(n, search));
  const filteredAll = state.neighborhoods.filter((n) => matchesSearch(n, search));

  return (
    <div className="flex w-full max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-3">
        <p className="text-sm font-bold text-muted">
          {state.neighborhoods.length} neighborhood{state.neighborhoods.length === 1 ? "" : "s"} sporing up
        </p>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Search neighborhoods"
          className="w-full rounded-xl bg-card-alt px-3.5 py-3 text-sm font-bold text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand-purple"
        />
      </div>

      {filteredJoined.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <h2 className="text-xs font-extrabold tracking-wide text-muted uppercase">Your neighborhoods</h2>
          <ul className="flex flex-col gap-2">
            {filteredJoined.map((n) => (
              <NeighborhoodCard
                key={n.id}
                neighborhood={n}
                signedIn={state.signedIn}
                pending={pendingId === n.id}
                onToggle={toggleJoined}
              />
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-2.5">
        <h2 className="text-xs font-extrabold tracking-wide text-muted uppercase">All neighborhoods</h2>
        {state.neighborhoods.length === 0 ? (
          <p className="text-sm text-muted">No neighborhoods yet.</p>
        ) : filteredAll.length === 0 ? (
          <p className="text-sm text-muted">No neighborhoods match &ldquo;{search}&rdquo;.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {filteredAll.map((n) => (
              <NeighborhoodCard
                key={n.id}
                neighborhood={n}
                signedIn={state.signedIn}
                pending={pendingId === n.id}
                onToggle={toggleJoined}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function NeighborhoodCard({
  neighborhood: n,
  signedIn,
  pending,
  onToggle,
}: {
  neighborhood: NeighborhoodSummary;
  signedIn: boolean;
  pending: boolean;
  onToggle: (n: NeighborhoodSummary) => void;
}) {
  return (
    <li className="flex flex-col gap-2.5 rounded-2xl bg-card-alt px-4 py-3 text-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <a href={`/neighborhoods/${n.slug}`} className="font-extrabold text-foreground hover:text-brand-purple">
            {n.name}
          </a>
          <p className="text-muted">
            {n.city}, {n.state}
          </p>
        </div>
        {signedIn ? (
          <button
            onClick={() => onToggle(n)}
            disabled={pending}
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
      </div>
      <div className="flex gap-3.5 text-xs font-bold text-muted">
        <span>🍄 {n.business_count} businesses</span>
        <span>👥 {n.member_count} members</span>
      </div>
    </li>
  );
}
