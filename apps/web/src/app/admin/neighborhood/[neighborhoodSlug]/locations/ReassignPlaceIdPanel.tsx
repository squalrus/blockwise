"use client";

import { useEffect, useState } from "react";
import type { GeoapifyReverseGeocodeResult, GeoapifyPlaceCandidate } from "@blockwise/types";
import { getAccessToken } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";

// Small, permanent "Find & attach" flow (BACKLOG.md Ref 114) on the regular
// Locations tab -- see the matching API routes' comment in app.ts for why
// it's still needed after the Geoapify migration itself is done (Geoapify's
// own place IDs can churn, and a real venue can simply not be in OSM yet).
// A distance-blind search is exactly how a wrong place got attached to a
// real venue 2,500+ miles away before this guardrail existed.
const ATTACH_CONFIRM_DISTANCE_METERS = 500;

type ReverseSuggestionState =
  | { status: "loading" }
  | { status: "found"; candidates: GeoapifyPlaceCandidate[] }
  | { status: "none" };

type SearchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "results"; candidates: GeoapifyPlaceCandidate[] }
  | { status: "error"; message: string };

function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters}m away`;
  return `${(meters / 1000).toFixed(1)}km away`;
}

export function ReassignPlaceIdPanel({
  neighborhoodId,
  locationId,
  onReassigned,
  onCancel,
}: {
  neighborhoodId: string;
  locationId: string;
  onReassigned: () => void;
  onCancel: () => void;
}) {
  const [reverseSuggestion, setReverseSuggestion] = useState<ReverseSuggestionState>({ status: "loading" });
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<SearchState>({ status: "idle" });
  const [reassigning, setReassigning] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadSuggestion() {
      const token = await getAccessToken();
      const res = await fetch(
        clientApiUrl(`/neighborhood-admin/neighborhoods/${neighborhoodId}/locations/${locationId}/reassign-reverse-geocode`),
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (cancelled) return;
      if (!res.ok) {
        setReverseSuggestion({ status: "none" });
        return;
      }
      const body: GeoapifyReverseGeocodeResult = await res.json();
      setReverseSuggestion(body.candidates.length > 0 ? { status: "found", candidates: body.candidates } : { status: "none" });
    }
    void loadSuggestion();
    return () => {
      cancelled = true;
    };
  }, [neighborhoodId, locationId]);

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearch({ status: "loading" });
    const token = await getAccessToken();
    const res = await fetch(
      clientApiUrl(
        `/neighborhood-admin/neighborhoods/${neighborhoodId}/locations/${locationId}/reassign-search?query=${encodeURIComponent(query)}`
      ),
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setSearch({ status: "error", message: body.error ?? "Search failed" });
      return;
    }
    const body: { candidates: GeoapifyPlaceCandidate[] } = await res.json();
    setSearch({ status: "results", candidates: body.candidates });
  }

  async function reassign(candidate: GeoapifyPlaceCandidate) {
    if (
      candidate.distance_meters > ATTACH_CONFIRM_DISTANCE_METERS &&
      !window.confirm(`This result is ${formatDistance(candidate.distance_meters)} from this location. Reassign anyway?`)
    ) {
      return;
    }
    setReassigning(true);
    const token = await getAccessToken();
    const res = await fetch(
      clientApiUrl(`/neighborhood-admin/neighborhoods/${neighborhoodId}/locations/${locationId}/reassign-place-id`),
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ geoapify_place_id: candidate.geoapify_place_id }),
      }
    );
    setReassigning(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setSearch({ status: "error", message: body.error ?? "Failed to reassign" });
      return;
    }
    onReassigned();
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card-alt p-3">
      {reverseSuggestion.status === "loading" && (
        <p className="text-xs text-muted">Checking what&apos;s at this location&apos;s coordinates now…</p>
      )}
      {reverseSuggestion.status === "found" && (
        <div className="flex flex-col gap-1.5">
          <p className="text-[10px] font-extrabold tracking-wide text-muted uppercase">Suggested — same coordinates</p>
          <ul className="flex flex-col gap-1.5">
            {reverseSuggestion.candidates.map((c) => (
              <li
                key={c.geoapify_place_id}
                className="flex items-center justify-between gap-2 rounded-md bg-brand-green/10 px-2.5 py-1.5"
              >
                <div>
                  <p className="text-xs font-extrabold text-foreground">{c.name}</p>
                  <p className="text-[11px] text-muted">{c.address}</p>
                </div>
                <button
                  type="button"
                  disabled={reassigning}
                  onClick={() => reassign(c)}
                  className="shrink-0 rounded-md bg-brand-green px-2.5 py-1 text-[11px] font-extrabold text-on-accent disabled:opacity-50"
                >
                  Reassign
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {reverseSuggestion.status === "none" && (
        <p className="text-xs text-muted">Nothing named at this location&apos;s coordinates today — search by name instead.</p>
      )}

      <form onSubmit={runSearch} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name"
          className="min-w-0 flex-1 rounded-md border border-border bg-card px-2 py-1 text-sm text-foreground"
        />
        <button
          type="submit"
          disabled={!query.trim() || search.status === "loading"}
          className="rounded-md bg-brand-purple px-3 py-1 text-xs font-bold text-on-accent disabled:opacity-50"
        >
          Search
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-border px-3 py-1 text-xs font-bold text-foreground"
        >
          Cancel
        </button>
      </form>

      {search.status === "loading" && <p className="text-xs text-muted">Searching…</p>}
      {search.status === "error" && <p className="text-xs text-red-600 dark:text-red-400">{search.message}</p>}
      {search.status === "results" && (
        <ul className="flex flex-col gap-1.5">
          {search.candidates.length === 0 && <li className="text-xs text-muted">No results.</li>}
          {search.candidates.map((c) => (
            <li key={c.geoapify_place_id} className="flex items-center justify-between gap-2 rounded-md bg-card px-2.5 py-1.5">
              <div>
                <p className="text-xs font-extrabold text-foreground">{c.name}</p>
                <p className="text-[11px] text-muted">
                  {c.address}{" "}
                  <span
                    className={
                      c.distance_meters > ATTACH_CONFIRM_DISTANCE_METERS
                        ? "font-bold text-red-600 dark:text-red-400"
                        : undefined
                    }
                  >
                    · {formatDistance(c.distance_meters)}
                  </span>
                </p>
              </div>
              <button
                type="button"
                disabled={reassigning}
                onClick={() => reassign(c)}
                className="shrink-0 rounded-md bg-brand-green px-2.5 py-1 text-[11px] font-extrabold text-on-accent disabled:opacity-50"
              >
                Reassign
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
