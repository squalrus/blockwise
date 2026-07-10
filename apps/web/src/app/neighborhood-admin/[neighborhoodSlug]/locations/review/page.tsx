"use client";

import { useState } from "react";
import type {
  CategoryOption,
  CommitLocationReviewResult,
  LocationClassification,
  LocationRemovalCandidate,
  LocationReviewCandidate,
  LocationReviewReport,
} from "@blockwise/types";
import { getAccessToken } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";
import { useNeighborhoodAdmin } from "../../NeighborhoodAdminContext";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "review"; report: LocationReviewReport }
  | { status: "committing"; report: LocationReviewReport }
  | { status: "done"; result: CommitLocationReviewResult }
  | { status: "error"; message: string };

interface Decision {
  classification: LocationClassification;
  categoryId: string;
  type: string;
}

function decisionKey(candidate: LocationReviewCandidate): string {
  return candidate.google_place_id;
}

function removalKey(removal: LocationRemovalCandidate): string {
  return removal.id;
}

// Bulk Places review + boundary reconciliation wizard (BACKLOG.md Ref 29 +
// Ref 54): reviews fresh Google Places candidates against the neighborhood's
// saved boundary and lets an admin bulk-classify each as a claimable
// business, a neighborhood-owned POI, or omit it; separately, lists every
// active venue/POI that no longer falls inside that boundary (e.g. after a
// redraw) for explicit approval before it's hidden -- nothing is ever hidden
// or created without the admin checking/choosing it here.
export default function LocationReviewPage() {
  const { neighborhoodId, slug } = useNeighborhoodAdmin();
  const [state, setState] = useState<State>({ status: "idle" });
  const [categories, setCategories] = useState<CategoryOption[] | null>(null);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  // Defaults to nothing approved -- an admin must explicitly check each
  // removal, mirroring the "must explicitly accept each removal" ask behind
  // the boundary re-map wizard (BACKLOG.md Ref 54).
  const [approvedRemovals, setApprovedRemovals] = useState<Set<string>>(new Set());

  async function loadCategories() {
    const token = await getAccessToken();
    const res = await fetch(clientApiUrl("/admin/categories"), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setCategories(await res.json());
  }

  async function runReview() {
    setState({ status: "loading" });
    await loadCategories();
    const token = await getAccessToken();
    const res = await fetch(
      clientApiUrl(`/neighborhood-admin/neighborhoods/${neighborhoodId}/locations/review`),
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setState({ status: "error", message: body.error ?? "Failed to review locations" });
      return;
    }
    const report: LocationReviewReport = await res.json();

    const initialDecisions: Record<string, Decision> = {};
    for (const candidate of report.new_candidates) {
      initialDecisions[decisionKey(candidate)] = {
        classification: "omit",
        categoryId: candidate.suggested_category_id ?? "",
        type: "",
      };
    }
    setDecisions(initialDecisions);
    setApprovedRemovals(new Set());
    setState({ status: "review", report });
  }

  function updateDecision(candidate: LocationReviewCandidate, patch: Partial<Decision>) {
    setDecisions((prev) => ({
      ...prev,
      [decisionKey(candidate)]: { ...prev[decisionKey(candidate)], ...patch },
    }));
  }

  function toggleRemoval(removal: LocationRemovalCandidate) {
    setApprovedRemovals((prev) => {
      const next = new Set(prev);
      const key = removalKey(removal);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function commit(report: LocationReviewReport) {
    setState({ status: "committing", report });
    const token = await getAccessToken();
    const classifications = report.new_candidates.map((candidate) => {
      const decision = decisions[decisionKey(candidate)];
      return {
        google_place_id: candidate.google_place_id,
        name: candidate.name,
        lat: candidate.lat,
        lng: candidate.lng,
        address: candidate.address,
        classification: decision.classification,
        ...(decision.classification === "business" ? { category_id: decision.categoryId } : {}),
        ...(decision.classification === "poi" ? { type: decision.type } : {}),
      };
    });

    const removals = report.proposed_removals
      .filter((removal) => approvedRemovals.has(removalKey(removal)))
      .map((removal) => ({ id: removal.id }));

    const res = await fetch(
      clientApiUrl(`/neighborhood-admin/neighborhoods/${neighborhoodId}/locations/review/commit`),
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ classifications, removals }),
      }
    );
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setState({ status: "error", message: body.error ?? "Failed to commit location review" });
      return;
    }
    setState({ status: "done", result: await res.json() });
  }

  const counts =
    state.status === "review" || state.status === "committing"
      ? state.report.new_candidates.reduce(
          (acc, candidate) => {
            acc[decisions[decisionKey(candidate)]?.classification ?? "omit"]++;
            return acc;
          },
          { business: 0, poi: 0, omit: 0 } as Record<LocationClassification, number>
        )
      : null;

  return (
    <div className="flex flex-col gap-4">
      <a
        href={`/neighborhood-admin/${slug}/locations`}
        className="text-sm font-bold text-brand-purple hover:text-brand-orange"
      >
        ← Locations
      </a>
      <h2 className="text-xs font-extrabold tracking-wide text-muted uppercase">Review Places</h2>
      <p className="text-sm text-muted">
        Queries Google Places for the neighborhood's current boundary and lists anything not already a
        business or point of interest. This costs a real API call — run it deliberately, not on every visit.
      </p>

      {state.status === "idle" && (
        <button
          type="button"
          onClick={runReview}
          className="self-start rounded-md bg-brand-purple px-4 py-2 text-sm font-bold text-on-accent"
        >
          Run review
        </button>
      )}

      {state.status === "loading" && <p className="text-sm text-muted">Querying Google Places…</p>}

      {state.status === "error" && <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>}

      {(state.status === "review" || state.status === "committing") && (
        <>
          <h3 className="text-xs font-extrabold tracking-wide text-muted uppercase">
            Removals ({state.report.proposed_removals.length})
          </h3>
          {state.report.proposed_removals.length === 0 ? (
            <p className="text-sm text-muted">
              Every active business and point of interest is still inside the boundary.
            </p>
          ) : (
            <>
              <p className="text-sm text-muted">
                No longer inside the neighborhood's boundary. Nothing is hidden unless you check it below —
                hiding preserves check-in/points history, it does not delete the row.
              </p>
              <ul className="flex flex-col gap-2">
                {state.report.proposed_removals.map((removal) => (
                  <li
                    key={removalKey(removal)}
                    className="flex items-center gap-3 rounded-2xl bg-card-alt px-4 py-3 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={approvedRemovals.has(removalKey(removal))}
                      disabled={state.status === "committing"}
                      onChange={() => toggleRemoval(removal)}
                    />
                    <div>
                      <p className="font-extrabold text-foreground">{removal.name}</p>
                      {removal.address && <p className="text-muted">{removal.address}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}

          <h3 className="text-xs font-extrabold tracking-wide text-muted uppercase">
            New entries ({state.report.new_candidates.length})
          </h3>
          {state.report.new_candidates.length === 0 ? (
            <p className="text-sm text-muted">No new places found inside the neighborhood's boundary.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {state.report.new_candidates.map((candidate) => {
                const decision = decisions[decisionKey(candidate)];
                return (
                  <li key={decisionKey(candidate)} className="rounded-2xl bg-card-alt px-4 py-3 text-sm">
                    <p className="font-extrabold text-foreground">{candidate.name}</p>
                    <p className="text-muted">{candidate.address}</p>
                    {candidate.suggested_category_name && (
                      <p className="text-xs font-bold text-muted">
                        Suggested category: {candidate.suggested_category_name}
                      </p>
                    )}

                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      {(["omit", "business", "poi"] as LocationClassification[]).map((option) => (
                        <label key={option} className="flex items-center gap-1 text-foreground">
                          <input
                            type="radio"
                            name={`classification-${decisionKey(candidate)}`}
                            checked={decision?.classification === option}
                            disabled={state.status === "committing"}
                            onChange={() => updateDecision(candidate, { classification: option })}
                          />
                          {option === "omit" ? "Omit" : option === "business" ? "Business" : "POI"}
                        </label>
                      ))}

                      {decision?.classification === "business" && (
                        <select
                          value={decision.categoryId}
                          disabled={!categories || state.status === "committing"}
                          onChange={(e) => updateDecision(candidate, { categoryId: e.target.value })}
                          className="rounded-md border border-border bg-card px-2 py-1 text-sm text-foreground"
                        >
                          <option value="" disabled>
                            Choose a category
                          </option>
                          {categories?.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.group_name ? `${c.group_name} / ${c.name}` : c.name}
                            </option>
                          ))}
                        </select>
                      )}

                      {decision?.classification === "poi" && (
                        <input
                          value={decision.type}
                          disabled={state.status === "committing"}
                          onChange={(e) => updateDecision(candidate, { type: e.target.value })}
                          placeholder="Type (e.g. park, transit, landmark)"
                          className="rounded-md border border-border bg-card px-2 py-1 text-sm text-foreground"
                        />
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {counts && (
            <div className="flex items-center gap-4 text-sm font-bold text-muted">
              <span>{counts.business} business</span>
              <span>{counts.poi} POI</span>
              <span>{counts.omit} omitted</span>
              <span>{approvedRemovals.size} to hide</span>
            </div>
          )}

          {(state.report.new_candidates.length > 0 || state.report.proposed_removals.length > 0) && (
            <button
              type="button"
              disabled={
                state.status === "committing" ||
                state.report.new_candidates.some((candidate) => {
                  const decision = decisions[decisionKey(candidate)];
                  return (
                    (decision.classification === "business" && !decision.categoryId) ||
                    (decision.classification === "poi" && !decision.type)
                  );
                })
              }
              onClick={() => commit(state.report)}
              className="self-start rounded-md bg-brand-purple px-4 py-2 text-sm font-bold text-on-accent disabled:opacity-50"
            >
              {state.status === "committing" ? "Committing…" : "Commit"}
            </button>
          )}
        </>
      )}

      {state.status === "done" && (
        <div className="flex flex-col gap-2 text-sm">
          <p className="text-foreground">
            Created {state.result.created_businesses.length} business
            {state.result.created_businesses.length === 1 ? "" : "es"} and{" "}
            {state.result.created_pois.length} point{state.result.created_pois.length === 1 ? "" : "s"} of
            interest. Hid {state.result.hidden.length}. Omitted {state.result.omitted.length}.
          </p>
          {state.result.failed.length > 0 && (
            <div className="text-red-600 dark:text-red-400">
              <p>Failed:</p>
              <ul className="list-inside list-disc">
                {state.result.failed.map((f) => (
                  <li key={f.name}>
                    {f.name}: {f.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <a
            href={`/neighborhood-admin/${slug}/locations`}
            className="self-start rounded-md border border-border px-3 py-1 text-foreground hover:bg-card-alt"
          >
            Back to Locations
          </a>
        </div>
      )}
    </div>
  );
}
