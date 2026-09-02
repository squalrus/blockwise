"use client";

import { useEffect, useState } from "react";
import type {
  GeoapifyMigrationCommitResult,
  GeoapifyMigrationLegacyLocation,
  GeoapifyMigrationLegacyLocationsResult,
  GeoapifyMigrationLocation,
  GeoapifyMigrationPossibleMatch,
  GeoapifyMigrationReverseGeocodeResult,
  GeoapifyMigrationReviewResult,
  GeoapifyMigrationSearchCandidate,
  NeighborhoodSummary,
} from "@blockwise/types";
import { getAccessToken } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";
import { MigrationStatusDonut } from "./MigrationStatusDonut";

// Disposable, one-time tool (BACKLOG.md Ref 114 Phase 5): every location
// synced before the Geoapify migration's Phase 4 cutover still carries its
// original Google place ID. Deliberately kept as its own super-admin page
// rather than folded into the permanent neighborhood-admin Locations/Review
// UI, so the whole thing -- this file, its API routes
// (apps/api/src/app.ts, search "geoapify-migration"), and the "Geoapify
// migration" sidebar tab in ../layout.tsx -- can be deleted cleanly once
// every location has a real Geoapify ID.
//
// Three sections: the two ways a location can fail to auto-match, plus a
// read-only record of what's already done.
// 1. Possible matches -- a fresh boundary search fuzzy-matched (name +
//    location) an existing location. Each needs an explicit approve before
//    its geoapify_place_id is rewritten -- never automatic, since a wrong
//    fuzzy match would silently attach the wrong place's data.
// 2. Legacy locations -- whatever's left with a Google-shaped ID after
//    that, i.e. Geoapify's boundary search never resurfaced it at all (a
//    real, confirmed coverage gap -- docs/geoapify-migration-plan.md
//    Phase 0). Search for it by hand and attach the right result.
// 3. Migrated locations -- the complement of #2: every location that
//    already holds a confirmed real Geoapify ID (or was never Places-backed
//    at all, e.g. a manually-added POI), read-only, for confirming progress
//    without leaving the page.

type ReviewState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "loaded"; result: GeoapifyMigrationReviewResult }
  | { status: "committing"; result: GeoapifyMigrationReviewResult }
  | { status: "error"; message: string };

type LegacyState =
  | { status: "idle" }
  | { status: "loading" }
  | {
      status: "loaded";
      totalLocations: number;
      locations: GeoapifyMigrationLegacyLocation[];
      migratedLocations: GeoapifyMigrationLocation[];
    }
  | { status: "error"; message: string };

type SearchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "results"; candidates: GeoapifyMigrationSearchCandidate[] }
  | { status: "error"; message: string };

// Auto-run the moment "Find & attach" opens for a location -- reverse-
// geocodes its own stored lat/lng rather than waiting on a manual query.
// "none" (as opposed to "error") means the lookup succeeded but Geoapify
// has no named POI at that exact point today, not a failure.
type ReverseSuggestionState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "found"; candidates: GeoapifyMigrationSearchCandidate[] }
  | { status: "none" };

// Splits the legacy/migrated lists (already fetched for the "2."/"3."
// sections below) by status, for the "Migration status" overview's
// per-status meters -- avoids a second API round trip for a breakdown
// that's just a different grouping of data already on the page.
function statusBreakdown(
  status: "active" | "hidden",
  legacyLocations: GeoapifyMigrationLegacyLocation[],
  migratedLocations: GeoapifyMigrationLocation[]
): { total: number; migrated: number } {
  const migrated = migratedLocations.filter((l) => l.status === status).length;
  const legacy = legacyLocations.filter((l) => l.status === status).length;
  return { total: migrated + legacy, migrated };
}

function matchKey(match: GeoapifyMigrationPossibleMatch): string {
  return `${match.location_id}:${match.geoapify_place_id}`;
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters}m away`;
  return `${(meters / 1000).toFixed(1)}km away`;
}

export default function GeoapifyMigrationPage() {
  const [neighborhoods, setNeighborhoods] = useState<NeighborhoodSummary[] | null>(null);
  const [neighborhoodId, setNeighborhoodId] = useState<string>("");
  const [review, setReview] = useState<ReviewState>({ status: "idle" });
  const [approved, setApproved] = useState<Set<string>>(new Set());
  const [commitResult, setCommitResult] = useState<GeoapifyMigrationCommitResult | null>(null);

  const [legacy, setLegacy] = useState<LegacyState>({ status: "idle" });
  const [attachingId, setAttachingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<SearchState>({ status: "idle" });
  const [reverseSuggestion, setReverseSuggestion] = useState<ReverseSuggestionState>({ status: "idle" });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    async function loadNeighborhoods() {
      const token = await getAccessToken();
      const res = await fetch(clientApiUrl("/neighborhoods"), { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const list: NeighborhoodSummary[] = await res.json();
      setNeighborhoods(list);
      if (list.length > 0) setNeighborhoodId(list[0].id);
    }
    void loadNeighborhoods();
  }, []);

  async function loadLegacyLocations(id: string) {
    setLegacy({ status: "loading" });
    const token = await getAccessToken();
    const res = await fetch(clientApiUrl(`/admin/geoapify-migration/neighborhoods/${id}/legacy-locations`), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      setLegacy({ status: "error", message: "Failed to load legacy locations" });
      return;
    }
    const result: GeoapifyMigrationLegacyLocationsResult = await res.json();
    setLegacy({
      status: "loaded",
      totalLocations: result.total_locations,
      locations: result.legacy,
      migratedLocations: result.migrated,
    });
  }

  useEffect(() => {
    if (!neighborhoodId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReview({ status: "idle" });
    setApproved(new Set());
    setCommitResult(null);
    setAttachingId(null);
    setSearch({ status: "idle" });
    void loadLegacyLocations(neighborhoodId);
  }, [neighborhoodId]);

  async function runReview() {
    setReview({ status: "loading" });
    setCommitResult(null);
    const token = await getAccessToken();
    const res = await fetch(clientApiUrl(`/admin/geoapify-migration/neighborhoods/${neighborhoodId}/review`), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setReview({ status: "error", message: body.error ?? "Failed to review locations" });
      return;
    }
    const result: GeoapifyMigrationReviewResult = await res.json();
    // Checked by default -- unlike the free-text search+attach flow
    // (BACKLOG.md Ref 114: nothing bounded that search's results, which is
    // how a same-named restaurant 2,500+ miles away got attached), every
    // possible match here already cleared a real bar to exist at all:
    // within 30m *and* >=60% name similarity (dedup.ts's isDuplicate).
    // Still reversible before committing -- an admin can uncheck any one
    // that still looks wrong.
    setApproved(new Set(result.possible_matches.map(matchKey)));
    setReview({ status: "loaded", result });
  }

  function toggleApproved(match: GeoapifyMigrationPossibleMatch) {
    setApproved((prev) => {
      const next = new Set(prev);
      const key = matchKey(match);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function commitApproved() {
    if (review.status !== "loaded") return;
    setReview({ status: "committing", result: review.result });
    const reidentifications = review.result.possible_matches
      .filter((m) => approved.has(matchKey(m)))
      .map((m) => ({ location_id: m.location_id, geoapify_place_id: m.geoapify_place_id }));

    const token = await getAccessToken();
    const res = await fetch(clientApiUrl(`/admin/geoapify-migration/neighborhoods/${neighborhoodId}/commit`), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ reidentifications }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setReview({ status: "error", message: body.error ?? "Failed to commit reidentifications" });
      return;
    }
    const result: GeoapifyMigrationCommitResult = await res.json();
    setCommitResult(result);
    setReview({ status: "idle" });
    void loadLegacyLocations(neighborhoodId);
  }

  async function startAttaching(location: GeoapifyMigrationLegacyLocation) {
    setAttachingId(location.id);
    setQuery(location.name);
    setSearch({ status: "idle" });
    setReverseSuggestion({ status: "loading" });

    const token = await getAccessToken();
    const res = await fetch(
      clientApiUrl(`/admin/geoapify-migration/neighborhoods/${neighborhoodId}/locations/${location.id}/reverse-geocode`),
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) {
      setReverseSuggestion({ status: "none" });
      return;
    }
    const body: GeoapifyMigrationReverseGeocodeResult = await res.json();
    setReverseSuggestion(
      body.candidates.length > 0 ? { status: "found", candidates: body.candidates } : { status: "none" }
    );
  }

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim() || !attachingId) return;
    setSearch({ status: "loading" });
    const token = await getAccessToken();
    const res = await fetch(
      clientApiUrl(
        `/admin/geoapify-migration/neighborhoods/${neighborhoodId}/investigate?query=${encodeURIComponent(query)}&location_id=${attachingId}`
      ),
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setSearch({ status: "error", message: body.error ?? "Search failed" });
      return;
    }
    const body: { candidates: GeoapifyMigrationSearchCandidate[] } = await res.json();
    setSearch({ status: "results", candidates: body.candidates });
  }

  // A distance-blind attach is exactly how a wrong Geoapify place got
  // silently attached to a real venue (BACKLOG.md Ref 114: "Kipos Greek"
  // matched a same-named restaurant 2,500+ miles away in Chapel Hill, NC).
  // Not a hard block -- a business can legitimately have moved a few blocks
  // within the neighborhood -- but anything past a short walk requires an
  // explicit, informed confirmation naming the actual distance.
  const ATTACH_CONFIRM_DISTANCE_METERS = 500;

  async function attach(candidate: GeoapifyMigrationSearchCandidate) {
    if (!attachingId) return;
    if (
      candidate.distance_meters > ATTACH_CONFIRM_DISTANCE_METERS &&
      !window.confirm(
        `This result is ${formatDistance(candidate.distance_meters)} from the location you're reconciling. Attach it anyway?`
      )
    ) {
      return;
    }
    const token = await getAccessToken();
    const res = await fetch(
      clientApiUrl(`/admin/geoapify-migration/neighborhoods/${neighborhoodId}/locations/${attachingId}/attach`),
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ geoapify_place_id: candidate.geoapify_place_id }),
      }
    );
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setSearch({ status: "error", message: body.error ?? "Failed to attach" });
      return;
    }
    setAttachingId(null);
    setSearch({ status: "idle" });
    setReverseSuggestion({ status: "idle" });
    void loadLegacyLocations(neighborhoodId);
  }

  async function deleteLegacyLocation(location: GeoapifyMigrationLegacyLocation) {
    if (!window.confirm(`Delete "${location.name}"? This can't be undone.`)) return;
    setDeletingId(location.id);
    setDeleteError(null);
    const token = await getAccessToken();
    const res = await fetch(
      clientApiUrl(`/admin/geoapify-migration/neighborhoods/${neighborhoodId}/locations/${location.id}`),
      { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
    );
    setDeletingId(null);
    if (res.status === 409) {
      const body = await res.json().catch(() => ({}));
      setDeleteError(body.error ?? "This location can't be deleted — hide it instead.");
      return;
    }
    if (!res.ok) {
      setDeleteError("Failed to delete location.");
      return;
    }
    void loadLegacyLocations(neighborhoodId);
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-heading text-3xl font-extrabold">Geoapify migration</h1>
        <p className="mt-1 text-sm text-muted">
          One-time backfill (BACKLOG.md Ref 114 Phase 5): reconciles every location&apos;s pre-migration Google
          place ID against real Geoapify data. Delete this page once every location below is clear.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm font-bold">
        Neighborhood
        <select
          value={neighborhoodId}
          onChange={(e) => setNeighborhoodId(e.target.value)}
          className="rounded-md border border-border bg-card px-2 py-1 text-sm text-foreground"
        >
          {neighborhoods?.map((n) => (
            <option key={n.id} value={n.id}>
              {n.name}
            </option>
          ))}
        </select>
      </label>

      {neighborhoodId && (
        <>
          <section className="rounded-2xl border border-border bg-card p-4">
            <h2 className="mb-3 text-xs font-extrabold tracking-wide text-muted uppercase">Migration status</h2>
            {legacy.status === "loading" && <p className="text-sm text-muted">Loading…</p>}
            {legacy.status === "error" && <p className="text-sm text-red-600 dark:text-red-400">{legacy.message}</p>}
            {legacy.status === "loaded" && (
              <MigrationStatusDonut
                totalLocations={legacy.totalLocations}
                legacyCount={legacy.locations.length}
                active={statusBreakdown("active", legacy.locations, legacy.migratedLocations)}
                hidden={statusBreakdown("hidden", legacy.locations, legacy.migratedLocations)}
              />
            )}
          </section>

          {/* --- Step 1: possible matches --- */}
          <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
            <h2 className="text-xs font-extrabold tracking-wide text-muted uppercase">
              1. Possible matches
            </h2>
            {review.status === "idle" && (
              <button
                type="button"
                onClick={runReview}
                className="self-start rounded-md bg-brand-purple px-4 py-2 text-sm font-bold text-on-accent"
              >
                Run boundary search
              </button>
            )}
            {review.status === "loading" && <p className="text-sm text-muted">Querying Geoapify…</p>}
            {review.status === "error" && <p className="text-sm text-red-600 dark:text-red-400">{review.message}</p>}

            {(review.status === "loaded" || review.status === "committing") && (
              <>
                {review.result.possible_matches.length === 0 ? (
                  <p className="text-sm text-muted">No fuzzy matches found against this boundary search.</p>
                ) : (
                  <>
                    <p className="text-sm text-muted">
                      Each of these is an existing location the search matched by name and location (within 30m and
                      a strong name match), not by place ID — checked by default. Uncheck any that don&apos;t
                      actually look right before committing; nothing is written until you do.
                    </p>
                    <ul className="flex flex-col gap-2">
                      {review.result.possible_matches
                        .slice()
                        .sort((a, b) => b.confidence_percent - a.confidence_percent)
                        .map((match) => (
                          <li
                            key={matchKey(match)}
                            className="flex items-start gap-3 rounded-xl bg-card-alt px-3.5 py-2.5 text-sm"
                          >
                            <input
                              type="checkbox"
                              className="mt-1"
                              checked={approved.has(matchKey(match))}
                              disabled={review.status === "committing"}
                              onChange={() => toggleApproved(match)}
                            />
                            <div className="flex-1">
                              <p className="flex flex-wrap items-center gap-1.5 font-extrabold text-foreground">
                                {match.existing_name} <span className="font-normal text-muted">→</span>{" "}
                                {match.matched_name}
                                {match.existing_status === "hidden" && (
                                  <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-extrabold text-muted">
                                    Hidden
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-muted">
                                {match.existing_address ?? "No address on file"} → {match.matched_address}
                              </p>
                              <p className="font-mono text-[11px] text-muted">
                                new geoapify_place_id: {match.geoapify_place_id}
                              </p>
                            </div>
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-extrabold ${
                                match.confidence_percent >= 85
                                  ? "bg-brand-green/20 text-brand-green"
                                  : match.confidence_percent >= 70
                                    ? "bg-brand-amber/20 text-brand-amber"
                                    : "bg-red-500/15 text-red-600 dark:text-red-400"
                              }`}
                            >
                              {match.confidence_percent}%
                            </span>
                          </li>
                        ))}
                    </ul>
                    <button
                      type="button"
                      disabled={approved.size === 0 || review.status === "committing"}
                      onClick={commitApproved}
                      className="self-start rounded-md bg-brand-purple px-4 py-2 text-sm font-bold text-on-accent disabled:opacity-50"
                    >
                      {review.status === "committing" ? "Committing…" : `Reidentify ${approved.size} approved`}
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={runReview}
                  disabled={review.status === "committing"}
                  className="self-start text-xs font-extrabold text-brand-purple hover:text-brand-orange"
                >
                  Run again
                </button>
              </>
            )}

            {commitResult && (
              <p className="text-sm text-foreground">
                Reidentified {commitResult.reidentified.length}.
                {commitResult.failed.length > 0 && (
                  <span className="text-red-600 dark:text-red-400">
                    {" "}
                    {commitResult.failed.length} failed: {commitResult.failed.map((f) => f.error).join(", ")}
                  </span>
                )}
              </p>
            )}
          </section>

          {/* --- Step 2: legacy locations (manual attach) --- */}
          <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
            <h2 className="text-xs font-extrabold tracking-wide text-muted uppercase">
              2. Still-legacy locations
            </h2>
            <p className="text-sm text-muted">
              Everything left with a Google-shaped place ID after the boundary search above — either Geoapify
              never resurfaced it, or it didn&apos;t clear the fuzzy match. Search and attach the right result by
              hand, or delete it if it's junk — a duplicate, or never a real place. Blocked only if it has real
              check-in, points, claim, coupon, or event history — that gets hidden instead, not deleted.
            </p>

            {deleteError && <p className="text-sm text-red-600 dark:text-red-400">{deleteError}</p>}
            {legacy.status === "loading" && <p className="text-sm text-muted">Loading…</p>}
            {legacy.status === "error" && <p className="text-sm text-red-600 dark:text-red-400">{legacy.message}</p>}
            {legacy.status === "loaded" && (
              <>
                {legacy.locations.length === 0 ? (
                  <p className="text-sm font-bold text-brand-green">
                    Every location in this neighborhood has a real Geoapify place ID. 🎉
                  </p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {legacy.locations.map((location) => (
                      <li key={location.id} className="rounded-xl bg-card-alt px-3.5 py-2.5 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="flex flex-wrap items-center gap-1.5 font-extrabold text-foreground">
                              {location.name}
                              {location.status === "hidden" && (
                                <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-extrabold text-muted">
                                  Hidden
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-muted">{location.address ?? "No address on file"}</p>
                          </div>
                          <div className="flex shrink-0 gap-2">
                            <button
                              type="button"
                              onClick={() => startAttaching(location)}
                              className="rounded-md border border-border px-3 py-1 text-xs font-extrabold text-foreground hover:bg-card"
                            >
                              {attachingId === location.id ? "Searching…" : "Find & attach"}
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteLegacyLocation(location)}
                              disabled={deletingId === location.id}
                              className="rounded-md border border-red-500/40 px-3 py-1 text-xs font-extrabold text-red-600 hover:bg-red-500/10 disabled:opacity-50 dark:text-red-400"
                            >
                              {deletingId === location.id ? "Deleting…" : "Delete"}
                            </button>
                          </div>
                        </div>

                        {attachingId === location.id && (
                          <div className="mt-2.5 flex flex-col gap-2 border-t border-border pt-2.5">
                            {reverseSuggestion.status === "loading" && (
                              <p className="text-xs text-muted">Checking what&apos;s at this location&apos;s coordinates now…</p>
                            )}
                            {reverseSuggestion.status === "found" && (
                              <div className="flex flex-col gap-1.5">
                                <p className="text-[10px] font-extrabold tracking-wide text-muted uppercase">
                                  Suggested — same coordinates
                                </p>
                                <ul className="flex flex-col gap-1.5">
                                  {reverseSuggestion.candidates.map((c) => (
                                    <li
                                      key={c.geoapify_place_id}
                                      className="flex items-center justify-between gap-2 rounded-md bg-brand-green/10 px-2.5 py-1.5"
                                    >
                                      <div>
                                        <p className="text-xs font-extrabold text-foreground">{c.name}</p>
                                        <p className="text-[11px] text-muted">
                                          {c.address} · {formatDistance(c.distance_meters)}
                                        </p>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => attach(c)}
                                        className="shrink-0 rounded-md bg-brand-green px-2.5 py-1 text-[11px] font-extrabold text-on-accent"
                                      >
                                        Attach
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {reverseSuggestion.status === "none" && (
                              <p className="text-xs text-muted">
                                Nothing named at this location&apos;s coordinates today — search by name instead.
                              </p>
                            )}

                            <form onSubmit={runSearch} className="flex gap-2">
                              <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
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
                                onClick={() => {
                                  setAttachingId(null);
                                  setReverseSuggestion({ status: "idle" });
                                }}
                                className="rounded-md border border-border px-3 py-1 text-xs font-bold text-foreground"
                              >
                                Cancel
                              </button>
                            </form>

                            {search.status === "loading" && <p className="text-xs text-muted">Searching…</p>}
                            {search.status === "error" && (
                              <p className="text-xs text-red-600 dark:text-red-400">{search.message}</p>
                            )}
                            {search.status === "results" && (
                              <ul className="flex flex-col gap-1.5">
                                {search.candidates.length === 0 && (
                                  <li className="text-xs text-muted">No results.</li>
                                )}
                                {search.candidates.map((c) => (
                                  <li
                                    key={c.geoapify_place_id}
                                    className="flex items-center justify-between gap-2 rounded-md bg-card px-2.5 py-1.5"
                                  >
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
                                      onClick={() => attach(c)}
                                      className="shrink-0 rounded-md bg-brand-green px-2.5 py-1 text-[11px] font-extrabold text-on-accent"
                                    >
                                      Attach
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </section>

          {/* --- Step 3: migrated locations (read-only) --- */}
          <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
            <h2 className="text-xs font-extrabold tracking-wide text-muted uppercase">3. Migrated locations</h2>
            <p className="text-sm text-muted">
              Everything not on the still-legacy list above — already holds a real Geoapify place ID, or was never
              backed by a Places record at all (e.g. a manually-added POI). Read-only.
            </p>

            {legacy.status === "loading" && <p className="text-sm text-muted">Loading…</p>}
            {legacy.status === "error" && <p className="text-sm text-red-600 dark:text-red-400">{legacy.message}</p>}
            {legacy.status === "loaded" &&
              (legacy.migratedLocations.length === 0 ? (
                <p className="text-sm text-muted">No migrated locations yet.</p>
              ) : (
                <ul className="flex max-h-96 flex-col gap-2 overflow-y-auto">
                  {legacy.migratedLocations.map((location) => (
                    <li
                      key={location.id}
                      className="flex items-center justify-between gap-3 rounded-xl bg-card-alt px-3.5 py-2.5 text-sm"
                    >
                      <div>
                        <p className="flex flex-wrap items-center gap-1.5 font-extrabold text-foreground">
                          {location.name}
                          {location.status === "hidden" && (
                            <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-extrabold text-muted">
                              Hidden
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted">{location.address ?? "No address on file"}</p>
                      </div>
                      <p
                        className="max-w-[140px] shrink-0 truncate font-mono text-[11px] text-muted"
                        title={location.geoapify_place_id ?? undefined}
                      >
                        {location.geoapify_place_id ?? "No Places ID"}
                      </p>
                    </li>
                  ))}
                </ul>
              ))}
          </section>
        </>
      )}
    </div>
  );
}
