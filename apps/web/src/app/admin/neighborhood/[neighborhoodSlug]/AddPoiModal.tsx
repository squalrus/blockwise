"use client";

import type { Venue } from "@blockwise/types";
import { PoiForm } from "./PoiForm";

// Locations tab's "+ Add point of interest" action, moved out of an
// inline form pushed into the list (which shoved every row down while
// open) into a modal, mirroring SendTestPushModal/FeedbackModal's shell.
// Wraps PoiForm's create mode (no `existing`) -- editing an existing POI
// stays inline under its own row in locations/page.tsx, where the form
// is already scoped to the specific location being edited.
export function AddPoiModal({
  neighborhoodId,
  onCreated,
  onClose,
}: {
  neighborhoodId: string;
  onCreated: (poi: Venue) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-card p-5 text-foreground shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-extrabold">Add point of interest</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1 text-muted hover:text-foreground"
          >
            ✕
          </button>
        </div>

        <div className="mt-3.5">
          <PoiForm neighborhoodId={neighborhoodId} onCreated={onCreated} onCancel={onClose} />
        </div>
      </div>
    </div>
  );
}
