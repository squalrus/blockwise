"use client";

import { useEffect, useRef, useState } from "react";
import type { NeighborhoodMembership } from "@blockwise/types";

// Pill dropdown next to the /checkin page's "Check in" heading, letting a
// user pick which of their neighborhoods' venues NearestVenues shows --
// picking one here sets it as their active neighborhood (is_primary),
// same as the "Set as active" control on /account/settings. Always shown
// (even with a single membership) so the current neighborhood has visible
// context; only hides when the user has none to show.
export function NeighborhoodSwitcher({
  neighborhoods,
  selectedId,
  onSelect,
}: {
  neighborhoods: NeighborhoodMembership[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const selected = neighborhoods.find((n) => n.neighborhood_id === selectedId);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setIsOpen(false);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  if (neighborhoods.length === 0) return null;

  return (
    <div className="relative ml-auto shrink-0" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        className="flex max-w-[170px] items-center gap-1.5 rounded-full bg-card-alt px-3.5 py-1.5 text-sm font-extrabold text-foreground hover:bg-card"
      >
        <span className="truncate">{selected?.name ?? "Neighborhood"}</span>
        <svg width="10" height="6" viewBox="0 0 10 6" className="shrink-0 text-muted" aria-hidden="true">
          <path d="M1 1 L5 5 L9 1" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-20 mt-1.5 max-h-72 w-56 overflow-y-auto rounded-2xl border border-border bg-card py-1.5 shadow-lg">
          {neighborhoods.map((n) => (
            <button
              key={n.neighborhood_id}
              type="button"
              onClick={() => {
                onSelect(n.neighborhood_id);
                setIsOpen(false);
              }}
              className={`block w-full truncate rounded-lg px-3 py-1.5 text-left text-sm font-bold ${
                n.neighborhood_id === selectedId ? "text-brand-purple" : "text-foreground hover:bg-card-alt"
              }`}
            >
              {n.name}
              {n.is_primary ? " · Active" : ""}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
