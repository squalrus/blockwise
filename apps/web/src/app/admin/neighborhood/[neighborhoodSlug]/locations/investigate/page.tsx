"use client";

import { useEffect, useState } from "react";
import type { CategoryOption, PlacesInvestigationReport } from "@blockwise/types";
import { getAccessToken } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";
import { useNeighborhoodAdmin } from "../../NeighborhoodAdminContext";
import { InvestigationResults } from "../InvestigationResults";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "results"; report: PlacesInvestigationReport }
  | { status: "error"; message: string };

// Missing-location investigation (BACKLOG.md Ref 96) -- a single free-text
// Geoapify Geocoding search for one reported-missing venue, distinct from
// the Reimport Locations wizard (a full-boundary Places search sweep
// restricted to the taxonomy's mapped categories). This isn't restricted at
// all, so it can find a place the boundary sweep never would, and annotates
// each result with the two most common reasons it looks "missing": outside
// the neighborhood's boundary, or already on record under a different name.
export default function InvestigateMissingLocationPage() {
  const { neighborhoodId, slug } = useNeighborhoodAdmin();
  const [query, setQuery] = useState("");
  const [state, setState] = useState<State>({ status: "idle" });
  const [categories, setCategories] = useState<CategoryOption[] | null>(null);
  // Forces InvestigationResults to remount per search (rather than reusing
  // one instance across searches) -- it owns its own categoryChoice/addedIds
  // state internally, keyed off the candidates it was first given, which
  // would otherwise carry over stale selections into a second search's
  // different candidate set.
  const [searchCount, setSearchCount] = useState(0);

  useEffect(() => {
    async function loadCategories() {
      const token = await getAccessToken();
      const res = await fetch(clientApiUrl("/admin/categories"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setCategories(await res.json());
    }
    void loadCategories();
  }, []);

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setState({ status: "loading" });
    const token = await getAccessToken();
    const res = await fetch(
      clientApiUrl(
        `/neighborhood-admin/neighborhoods/${neighborhoodId}/locations/investigate?query=${encodeURIComponent(query)}`
      ),
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setState({ status: "error", message: body.error ?? "Failed to investigate location" });
      return;
    }

    const report: PlacesInvestigationReport = await res.json();
    setSearchCount((c) => c + 1);
    setState({ status: "results", report });
  }

  return (
    <div className="flex flex-col gap-4">
      <a
        href={`/admin/neighborhood/${slug}/locations`}
        className="text-sm font-bold text-brand-purple hover:text-brand-orange"
      >
        ← Locations
      </a>
      <h2 className="text-xs font-extrabold tracking-wide text-muted uppercase">Investigate a missing venue</h2>
      <p className="text-sm text-muted">
        Search Geoapify directly for a venue name or address a neighbor reported as missing. Unlike Reimport
        Locations, this isn&apos;t restricted to the saved boundary or to mapped business types, so it can turn up a
        place the normal review flow never would — useful for telling a real gap in Geoapify&apos;s data apart from a
        venue that&apos;s simply outside the boundary or already on record under a different name.
      </p>

      <form onSubmit={runSearch} className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Venue name or address"
          className="min-w-64 flex-1 rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground"
        />
        <button
          type="submit"
          disabled={!query.trim() || state.status === "loading"}
          className="rounded-md bg-brand-purple px-4 py-2 text-sm font-bold text-on-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          {state.status === "loading" ? "Searching…" : "Search"}
        </button>
      </form>

      {state.status === "error" && <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>}

      {state.status === "results" && (
        <InvestigationResults
          key={searchCount}
          neighborhoodId={neighborhoodId}
          candidates={state.report.candidates}
          categories={categories}
          emptyMessage={
            <>
              Geoapify returned nothing for &ldquo;{state.report.query}&rdquo;. See{" "}
              <code>docs/investigating-missing-venues.md</code> for common reasons a venue doesn&apos;t turn up
              here at all.
            </>
          }
        />
      )}
    </div>
  );
}
