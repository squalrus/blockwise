"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { CategoryOption, PlacesInvestigationCandidate } from "@blockwise/types";
import { getAccessToken } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";

// Renders one Places investigation's candidates plus the "Add as venue"
// shortcut (BACKLOG.md Ref 96) -- shared between the standalone Investigate
// page (locations/investigate/page.tsx) and the neighborhood-admin
// missing-venue feedback triage list's inline "Quick investigate" (BACKLOG.md
// Ref 80/96), both of which run the same GET
// .../locations/investigate?query= lookup and need the identical
// result-list/category-picker/add-as-venue UI on top of it.
export function InvestigationResults({
  neighborhoodId,
  candidates,
  categories,
  emptyMessage,
}: {
  neighborhoodId: string;
  candidates: PlacesInvestigationCandidate[];
  categories: CategoryOption[] | null;
  emptyMessage?: ReactNode;
}) {
  const [categoryChoice, setCategoryChoice] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const candidate of candidates) initial[candidate.google_place_id] = candidate.suggested_category_id ?? "";
    return initial;
  });
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [addError, setAddError] = useState<string | null>(null);

  const sortedCategories = useMemo(
    () =>
      [...(categories ?? [])].sort((a, b) => {
        const groupCompare = (a.group_name ?? "").localeCompare(b.group_name ?? "");
        return groupCompare !== 0 ? groupCompare : a.name.localeCompare(b.name);
      }),
    [categories]
  );

  async function addAsVenue(candidate: PlacesInvestigationCandidate) {
    const categoryId = categoryChoice[candidate.google_place_id];
    if (!categoryId) return;

    setAddingId(candidate.google_place_id);
    setAddError(null);
    const token = await getAccessToken();
    const res = await fetch(
      clientApiUrl(`/neighborhood-admin/neighborhoods/${neighborhoodId}/locations/investigate/add`),
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          google_place_id: candidate.google_place_id,
          name: candidate.name,
          lat: candidate.lat,
          lng: candidate.lng,
          address: candidate.address,
          category_id: categoryId,
        }),
      }
    );
    setAddingId(null);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setAddError(body.error ?? "Failed to add location");
      return;
    }
    setAddedIds((prev) => new Set(prev).add(candidate.google_place_id));
  }

  if (candidates.length === 0) {
    return <p className="text-sm text-muted">{emptyMessage ?? "Google Places returned nothing for this search."}</p>;
  }

  return (
    <>
      {addError && <p className="text-sm text-red-600 dark:text-red-400">{addError}</p>}
      <ul className="flex flex-col gap-2">
        {candidates.map((candidate) => {
          const added = addedIds.has(candidate.google_place_id);
          return (
            <li key={candidate.google_place_id} className="rounded-2xl bg-card-alt px-4 py-3 text-sm">
              <p className="font-extrabold text-foreground">{candidate.name}</p>
              <p className="text-muted">{candidate.address}</p>

              <div className="mt-1.5 flex flex-wrap gap-1.5 text-xs font-bold">
                {candidate.business_status && candidate.business_status !== "OPERATIONAL" && (
                  <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-red-600 dark:text-red-400">
                    {candidate.business_status.replace(/_/g, " ").toLowerCase()}
                  </span>
                )}
                {candidate.inside_boundary === false && (
                  <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-600 dark:text-amber-400">
                    Outside boundary
                  </span>
                )}
                {candidate.already_known_as && (
                  <span className="rounded-full bg-brand-green/15 px-2 py-0.5 text-brand-green">
                    Already on record as &ldquo;{candidate.already_known_as}&rdquo;
                  </span>
                )}
              </div>

              {candidate.suggested_category_name && (
                <p className="mt-1.5 text-xs font-bold text-muted">
                  Suggested category: {candidate.suggested_category_name}
                </p>
              )}

              {!candidate.already_known_as && !added && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <select
                    value={categoryChoice[candidate.google_place_id] ?? ""}
                    disabled={!categories || addingId === candidate.google_place_id}
                    onChange={(e) =>
                      setCategoryChoice((prev) => ({ ...prev, [candidate.google_place_id]: e.target.value }))
                    }
                    className="rounded-md border border-border bg-card px-2 py-1 text-sm text-foreground"
                  >
                    <option value="" disabled>
                      Choose a category
                    </option>
                    {sortedCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.group_name ? `${c.group_name} / ${c.name}` : c.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={!categoryChoice[candidate.google_place_id] || addingId === candidate.google_place_id}
                    onClick={() => addAsVenue(candidate)}
                    className="rounded-md bg-brand-green px-3 py-1 text-xs font-bold text-on-accent disabled:opacity-50"
                  >
                    {addingId === candidate.google_place_id ? "Adding…" : "Add as venue"}
                  </button>
                </div>
              )}
              {added && <p className="mt-2 text-xs font-bold text-brand-green">Added as a business.</p>}
            </li>
          );
        })}
      </ul>
    </>
  );
}
