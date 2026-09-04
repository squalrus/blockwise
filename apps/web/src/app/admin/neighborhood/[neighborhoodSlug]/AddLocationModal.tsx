"use client";

import { useState } from "react";
import type { LocationKind, Venue } from "@blockwise/types";
import { PoiForm } from "./PoiForm";

// Locations tab's "+ Add location" action, moved out of an inline form
// pushed into the list (which shoved every row down while open) into a
// modal, mirroring SendTestPushModal/FeedbackModal's shell. Wraps PoiForm's
// create mode (no `existing`) with a POI/Business kind toggle -- editing an
// existing location stays inline under its own row in locations/page.tsx,
// where the form is already scoped to the specific location being edited.
export function AddLocationModal({
  neighborhoodId,
  onCreated,
  onClose,
}: {
  neighborhoodId: string;
  onCreated: (location: Venue) => void;
  onClose: () => void;
}) {
  const [kind, setKind] = useState<LocationKind>("poi");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-card p-5 text-foreground shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-extrabold">Add location</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1 text-muted hover:text-foreground"
          >
            ✕
          </button>
        </div>

        <div className="mt-3.5 flex gap-0.5 rounded-xl bg-card-alt p-0.75">
          {(["poi", "business"] as LocationKind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={`flex-1 rounded-lg px-3.5 py-1.75 text-[13px] font-extrabold ${
                kind === k ? "bg-foreground text-background" : "text-muted-strong"
              }`}
            >
              {k === "poi" ? "Point of interest" : "Business"}
            </button>
          ))}
        </div>

        <div className="mt-3.5">
          <PoiForm key={kind} neighborhoodId={neighborhoodId} kind={kind} onCreated={onCreated} onCancel={onClose} />
        </div>
      </div>
    </div>
  );
}
