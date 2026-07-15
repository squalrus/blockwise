"use client";

import { useEffect, useRef, useState } from "react";
import type { AppUser, ClaimedVenueSummary, NeighborhoodAdminSummary } from "@blockwise/types";
import { getAccessToken } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";

export interface AdminSwitcherCurrent {
  kind: "neighborhood" | "business";
  id: string;
  label: string;
  sublabel?: string;
}

// Replaces the old static "back to the list page" sidebar card now that
// /business and /neighborhood-admin (the plain list pages) are gone -- an
// account can administer many neighborhoods *and* own many businesses
// (independent AppUser.account_type / is_neighborhood_admin flags), so this
// is the one place both are browsable and switchable from inside either
// standalone shell (admin/neighborhood/[slug]/layout.tsx,
// admin/business/[venueId]/layout.tsx).
export function AdminSwitcher({ current, user }: { current: AdminSwitcherCurrent; user: AppUser }) {
  const [neighborhoods, setNeighborhoods] = useState<NeighborhoodAdminSummary[]>([]);
  const [venues, setVenues] = useState<ClaimedVenueSummary[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const token = await getAccessToken();
      const headers = { Authorization: `Bearer ${token}` };
      // Best-effort: a 403 here just means this account isn't that kind of
      // admin, not an error worth surfacing.
      const [neighborhoodsRes, venuesRes] = await Promise.all([
        fetch(clientApiUrl("/neighborhood-admin/neighborhoods"), { headers }),
        fetch(clientApiUrl("/business/venues"), { headers }),
      ]);
      if (cancelled) return;
      setNeighborhoods(neighborhoodsRes.ok ? await neighborhoodsRes.json() : []);
      setVenues(venuesRes.ok ? await venuesRes.json() : []);
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    return () => {
      cancelled = true;
    };
  }, []);

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

  const showNeighborhoodsGroup = neighborhoods.length > 0 || user.is_neighborhood_admin;
  const showBusinessesGroup = venues.length > 0;
  const showEmptyState = !showNeighborhoodsGroup && !showBusinessesGroup;

  return (
    <div className="relative mb-4" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        className="flex w-full items-center gap-2.5 rounded-2xl bg-nav-foreground/8 p-3 text-left hover:bg-nav-foreground/12"
      >
        <div className="min-w-0 flex-1">
          <div className="truncate font-heading text-[15px] leading-tight font-bold text-nav-foreground">
            {current.label}
          </div>
          {current.sublabel && <div className="truncate text-[11px] text-nav-muted">{current.sublabel}</div>}
        </div>
        <svg width="10" height="6" viewBox="0 0 10 6" className="shrink-0 text-nav-muted" aria-hidden="true">
          <path d="M1 1 L5 5 L9 1" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1.5 max-h-80 overflow-y-auto rounded-2xl border border-border bg-card py-1.5 text-foreground shadow-lg">
          {showNeighborhoodsGroup && (
            <div className="px-1.5 pb-1">
              <div className="px-2.5 pt-1.5 pb-1 font-mono text-[10px] tracking-wide text-muted uppercase">
                Neighborhoods
              </div>
              {neighborhoods.map((n) => (
                <a
                  key={n.neighborhood_id}
                  href={`/admin/neighborhood/${n.slug}`}
                  className={`block truncate rounded-lg px-2.5 py-1.5 text-[13px] font-bold ${
                    current.kind === "neighborhood" && current.id === n.neighborhood_id
                      ? "text-brand-purple"
                      : "text-foreground hover:bg-card-alt"
                  }`}
                >
                  {n.name}
                </a>
              ))}
              {user.is_neighborhood_admin && (
                <a
                  href="/admin/neighborhood/new"
                  className="block rounded-lg px-2.5 py-1.5 text-[13px] font-bold text-brand-purple hover:bg-card-alt"
                >
                  + New neighborhood
                </a>
              )}
            </div>
          )}

          {showBusinessesGroup && (
            <div className="px-1.5 pb-1">
              {showNeighborhoodsGroup && <div className="my-1 border-t border-border" />}
              <div className="px-2.5 pt-1.5 pb-1 font-mono text-[10px] tracking-wide text-muted uppercase">
                Businesses
              </div>
              {venues.map((v) => (
                <a
                  key={v.venue_id}
                  href={`/admin/business/${v.venue_id}`}
                  className={`block truncate rounded-lg px-2.5 py-1.5 text-[13px] font-bold ${
                    current.kind === "business" && current.id === v.venue_id
                      ? "text-brand-purple"
                      : "text-foreground hover:bg-card-alt"
                  }`}
                >
                  {v.name}
                </a>
              ))}
            </div>
          )}

          {showEmptyState && <p className="px-3 py-2 text-[13px] text-muted">Nothing else to switch to.</p>}
        </div>
      )}
    </div>
  );
}
