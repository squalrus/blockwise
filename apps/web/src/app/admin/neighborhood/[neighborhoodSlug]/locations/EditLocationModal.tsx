"use client";

import { useState } from "react";
import type { CategoryOption, LocationListItem } from "@blockwise/types";
import { ReassignPlaceIdPanel } from "./ReassignPlaceIdPanel";

// Business row's "Edit" action (three-dot menu) -- consolidates the two
// existing per-row editing paths, category reassignment (was an
// always-visible inline <select>) and Geoapify place-id reassignment (was a
// menu item toggling ReassignPlaceIdPanel below the row), into one modal,
// mirroring AddLocationModal's shell. POIs carry no category of their own,
// so this is business-only; POI editing stays on PoiForm via its own "Edit"
// menu item.
export function EditLocationModal({
  neighborhoodId,
  location,
  categories,
  sortedCategories,
  saving,
  onCategoryChange,
  onReassigned,
  onClose,
}: {
  neighborhoodId: string;
  location: LocationListItem;
  categories: CategoryOption[] | null;
  sortedCategories: CategoryOption[];
  saving: boolean;
  onCategoryChange: (categoryId: string) => void;
  onReassigned: () => void;
  onClose: () => void;
}) {
  // Local to the modal, not lifted to the parent's reassigningId -- the
  // panel only ever needs to collapse back to its own trigger button here,
  // never toggled from outside the modal.
  const [showReassign, setShowReassign] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-card p-5 text-foreground shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="truncate font-heading text-lg font-extrabold">Edit {location.name}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-full p-1 text-muted hover:text-foreground"
          >
            ✕
          </button>
        </div>

        <div className="mt-3.5 flex flex-col gap-3.5">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-extrabold tracking-wide text-muted uppercase">Category</span>
            <select
              value={location.category_id ?? ""}
              disabled={!categories || saving}
              onChange={(e) => onCategoryChange(e.target.value)}
              className="rounded-lg border border-border bg-card-alt px-3 py-2 text-sm text-foreground"
            >
              <option value="" disabled>
                {location.category_or_type}
              </option>
              {sortedCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.group_name ? `${c.group_name} / ${c.name}` : c.name}
                </option>
              ))}
            </select>
          </label>

          {showReassign ? (
            <ReassignPlaceIdPanel
              neighborhoodId={neighborhoodId}
              locationId={location.id}
              onReassigned={() => {
                setShowReassign(false);
                onReassigned();
              }}
              onCancel={() => setShowReassign(false)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setShowReassign(true)}
              className="self-start rounded-md border border-border px-3 py-1.5 text-xs font-extrabold text-foreground hover:bg-card-alt"
            >
              Reassign place ID
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
