"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { AppUser, ClaimedVenueSummary } from "@blockwise/types";
import { getAccessToken, getCurrentUser } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";
import { MushroomLogo } from "@blockwise/ui";
import { Avatar } from "../../../Avatar";
import { AdminSwitcher } from "../../../AdminSwitcher";
import { BusinessAdminProvider } from "./BusinessAdminContext";
import packageJson from "../../../../../package.json";

type State =
  | { status: "loading" }
  | { status: "signed_out" }
  | { status: "wrong_account_type" }
  | { status: "forbidden" }
  | { status: "ready"; venue: ClaimedVenueSummary; user: AppUser }
  | { status: "error"; message: string };

function OverviewIcon({ className }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" className={className} aria-hidden="true">
      <rect x="2" y="2" width="7" height="7" rx="2" fill="currentColor" />
      <rect x="11" y="2" width="7" height="7" rx="2" fill="currentColor" opacity="0.55" />
      <rect x="2" y="11" width="7" height="7" rx="2" fill="currentColor" opacity="0.55" />
      <rect x="11" y="11" width="7" height="7" rx="2" fill="currentColor" />
    </svg>
  );
}

// Business owner venue dashboard (BACKLOG.md), restyled into the same
// standalone sidebar shell as admin/neighborhood/[neighborhoodSlug]/layout.tsx
// (docs/url-map.md refactor folding /business and /neighborhood-admin under
// /admin) -- an account can own multiple claimed venues, so this resolves
// venueId against GET /business/venues the same way the neighborhood layout
// resolves slug against GET /neighborhood-admin/neighborhoods. Ownership of
// this specific venue is still enforced server-side per route
// (venueOwnerGate); "forbidden" below is the client-side UX for a business
// account that navigates to a venue it doesn't hold an approved claim on.
export default function BusinessAdminLayout({ children }: { children: React.ReactNode }) {
  const { venueId } = useParams<{ venueId: string }>();
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const user: AppUser | null = await getCurrentUser();
      if (cancelled) return;
      if (!user) {
        setState({ status: "signed_out" });
        return;
      }
      if (user.account_type !== "business") {
        setState({ status: "wrong_account_type" });
        return;
      }

      const token = await getAccessToken();
      const res = await fetch(clientApiUrl("/business/venues"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (cancelled) return;
      if (!res.ok) {
        setState({ status: "error", message: "Failed to load your claimed venues" });
        return;
      }

      const venues: ClaimedVenueSummary[] = await res.json();
      const venue = venues.find((v) => v.venue_id === venueId);
      if (!venue) {
        setState({ status: "forbidden" });
        return;
      }
      setState({ status: "ready", venue, user });
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    return () => {
      cancelled = true;
    };
  }, [venueId]);

  if (state.status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted">Loading…</p>
      </div>
    );
  }

  if (state.status !== "ready") {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4 font-sans sm:p-16">
        <a href="/admin" className="text-sm font-bold text-brand-purple hover:text-brand-orange">
          ← Admin
        </a>
        {state.status === "signed_out" && (
          <p className="text-sm text-muted">
            <a href="/login" className="font-bold text-brand-purple hover:text-brand-orange">
              Log in
            </a>{" "}
            with a business account to manage this venue.
          </p>
        )}
        {state.status === "wrong_account_type" && (
          <p className="text-sm text-muted">
            This account isn&apos;t a business account. Upgrade it from{" "}
            <a href="/admin" className="font-bold text-brand-purple hover:text-brand-orange">
              /admin
            </a>{" "}
            first.
          </p>
        )}
        {state.status === "forbidden" && (
          <p className="text-sm text-red-600 dark:text-red-400">
            This account doesn&apos;t have an approved claim on this venue.
          </p>
        )}
        {state.status === "error" && <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>}
      </div>
    );
  }

  const { venue, user } = state;

  return (
    <div className="flex h-screen overflow-hidden bg-background font-sans text-foreground">
      {/* ================= SIDEBAR ================= */}
      <div className="flex w-64 shrink-0 flex-col bg-nav px-3.5 pt-4.5 pb-4 text-nav-foreground">
        <div className="flex items-center gap-2.5 px-2 pb-4">
          <MushroomLogo size={26} capColor="var(--brand-orange)" stemClassName="text-nav-foreground" />
          <span className="font-heading text-xl font-extrabold text-nav-foreground">Spored</span>
          <span className="ml-auto rounded-full bg-nav-foreground/10 px-2 py-0.75 font-mono text-[10px] text-nav-muted">
            admin
          </span>
        </div>

        <AdminSwitcher
          current={{ kind: "business", id: venue.venue_id, label: venue.name, sublabel: venue.address }}
          user={user}
        />

        <div className="px-2.5 pb-2 font-mono text-[10px] tracking-wide text-nav-muted/80 uppercase">Manage</div>

        <nav className="flex flex-col gap-0.5">
          <a
            href={`/admin/business/${venueId}`}
            className="flex items-center gap-2.5 rounded-xl bg-card px-3 py-2.5 text-sm font-extrabold text-foreground"
          >
            <OverviewIcon className="shrink-0" />
            <span>Overview</span>
          </a>
        </nav>

        <div className="flex-1" />

        <a
          href={`/location/${venueId}`}
          className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-bold text-nav-muted hover:bg-nav-foreground/8"
        >
          <svg width="16" height="16" viewBox="0 0 20 20" aria-hidden="true">
            <path
              d="M8 4 L4 4 Q3 4 3 5 L3 16 Q3 17 4 17 L15 17 Q16 17 16 16 L16 12"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M11 3 L17 3 L17 9"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M17 3 L9.5 10.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          View public page
        </a>
        <div className="px-3 pt-2 font-mono text-[10px] text-nav-muted/60">Spored v{packageJson.version}</div>
      </div>

      {/* ================= WORKSPACE ================= */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-[1460px] flex-col px-9 pt-5.5 pb-18">
          <div className="mb-5.5 flex items-center gap-3.5">
            <a href="/admin" className="text-[13px] font-bold text-foreground hover:text-brand-purple">
              ← Admin
            </a>
            <div className="flex-1" />
            <a href="/account" className="flex items-center gap-2 rounded-full bg-card-alt py-1 pr-3.5 pl-1">
              <Avatar
                avatarUrl={user.avatar_url}
                avatarStyle={user.avatar_style}
                mushroomCustomization={user.mushroom_customization}
                seed={user.id}
                label={user.display_name ?? "Admin"}
                size={26}
              />
              <span className="text-[13px] font-extrabold text-foreground">{user.display_name ?? "Admin"}</span>
              <span className="font-mono text-[10px] text-muted">admin</span>
            </a>
          </div>

          <BusinessAdminProvider value={{ venueId, name: venue.name, address: venue.address }}>
            {children}
          </BusinessAdminProvider>
        </div>
      </div>
    </div>
  );
}
