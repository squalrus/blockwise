"use client";

import { useEffect, useState } from "react";
import { usePathname, useParams } from "next/navigation";
import type { AppUser, NeighborhoodAdminSummary, NeighborhoodProfile } from "@blockwise/types";
import { getAccessToken, getCurrentUser, logOut } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";
import { MushroomLoader } from "@blockwise/ui";
import { AdminShell, type AdminShellTab } from "../../AdminShell";
import { NeighborhoodAdminProvider } from "./NeighborhoodAdminContext";

type State =
  | { status: "loading" }
  | { status: "signed_out" }
  | { status: "forbidden" }
  | { status: "ready"; neighborhood: NeighborhoodAdminSummary; user: AppUser }
  | { status: "error"; message: string };

type TabKey = "overview" | "boundary" | "locations" | "claims" | "events" | "challenges" | "analytics";

const TABS: { key: TabKey; href: string; label: string; icon: (props: { className?: string }) => React.ReactNode }[] = [
  {
    key: "overview",
    href: "",
    label: "Overview",
    icon: ({ className }) => (
      <svg width="18" height="18" viewBox="0 0 20 20" className={className} aria-hidden="true">
        <rect x="2" y="2" width="7" height="7" rx="2" fill="currentColor" />
        <rect x="11" y="2" width="7" height="7" rx="2" fill="currentColor" opacity="0.55" />
        <rect x="2" y="11" width="7" height="7" rx="2" fill="currentColor" opacity="0.55" />
        <rect x="11" y="11" width="7" height="7" rx="2" fill="currentColor" />
      </svg>
    ),
  },
  {
    key: "boundary",
    href: "/boundary",
    label: "Boundary",
    icon: ({ className }) => (
      <svg width="18" height="18" viewBox="0 0 20 20" className={className} aria-hidden="true">
        <path
          d="M4 5 L15 3 L17 12 L12 17 L3 14 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <circle cx="4" cy="5" r="2" fill="currentColor" />
        <circle cx="15" cy="3" r="2" fill="currentColor" />
        <circle cx="12" cy="17" r="2" fill="currentColor" />
      </svg>
    ),
  },
  {
    key: "locations",
    href: "/locations",
    label: "Locations",
    icon: ({ className }) => (
      <svg width="18" height="18" viewBox="0 0 20 20" className={className} aria-hidden="true">
        <path
          d="M10 18 C10 18 4 11.5 4 7.2 A6 6 0 0 1 16 7.2 C16 11.5 10 18 10 18 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <circle cx="10" cy="7.4" r="2" fill="currentColor" />
      </svg>
    ),
  },
  {
    key: "claims",
    href: "/claims",
    label: "Business claims",
    icon: ({ className }) => (
      <svg width="18" height="18" viewBox="0 0 20 20" className={className} aria-hidden="true">
        <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
        <path
          d="M6.5 10.2 L9 12.6 L13.6 7.6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    key: "events",
    href: "/events",
    label: "Events",
    icon: ({ className }) => (
      <svg width="18" height="18" viewBox="0 0 20 20" className={className} aria-hidden="true">
        <rect x="2" y="4" width="16" height="14" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M2 8.5 L18 8.5" stroke="currentColor" strokeWidth="2" />
        <rect x="6" y="1.5" width="2" height="4" rx="1" fill="currentColor" />
        <rect x="12" y="1.5" width="2" height="4" rx="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    key: "challenges",
    href: "/challenges",
    label: "Challenges",
    icon: ({ className }) => (
      <svg width="18" height="18" viewBox="0 0 20 20" className={className} aria-hidden="true">
        <path
          d="M10 2.5 12.2 7 17 7.7 13.5 11 14.4 15.7 10 13.4 5.6 15.7 6.5 11 3 7.7 7.8 7Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    key: "analytics",
    href: "/analytics",
    label: "Analytics",
    icon: ({ className }) => (
      <svg width="18" height="18" viewBox="0 0 20 20" className={className} aria-hidden="true">
        <rect x="3" y="11" width="3.5" height="6" rx="1" fill="currentColor" opacity="0.55" />
        <rect x="8.25" y="6" width="3.5" height="11" rx="1" fill="currentColor" />
        <rect x="13.5" y="2.5" width="3.5" height="14.5" rx="1" fill="currentColor" opacity="0.8" />
      </svg>
    ),
  },
];

// Neighborhood profile pages (BACKLOG.md) + docs/url-map.md refactor: single
// enforcement point for the neighborhood-admin tabs (Overview, Boundary,
// Locations, Business claims). Resolves the route's slug against the list of
// neighborhoods this account administers -- admin-of-this-specific-
// neighborhood is still enforced server-side per route
// (neighborhoodAdminGate), this is just the client-side UX for loading/
// forbidden state and the sidebar shell itself.
//
// This is a standalone sidebar shell (BACKLOG.md Ref 31 "SimCity-style UI
// redesign for neighborhood management") -- SiteChrome.tsx hides the site's
// AccountNav/Footer for these routes so this layout supplies all of its own
// chrome instead of stacking on top of it.
export default function NeighborhoodAdminLayout({ children }: { children: React.ReactNode }) {
  const { neighborhoodSlug } = useParams<{ neighborhoodSlug: string }>();
  const pathname = usePathname();
  const [state, setState] = useState<State>({ status: "loading" });
  const [profile, setProfile] = useState<NeighborhoodProfile | null>(null);
  const [pendingClaimCount, setPendingClaimCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const user: AppUser | null = await getCurrentUser();
      if (cancelled) return;
      if (!user) {
        setState({ status: "signed_out" });
        return;
      }

      const token = await getAccessToken();
      const res = await fetch(clientApiUrl("/neighborhood-admin/neighborhoods"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (cancelled) return;
      if (!res.ok) {
        setState({ status: "error", message: "Failed to load your administered neighborhoods" });
        return;
      }

      const neighborhoods: NeighborhoodAdminSummary[] = await res.json();
      const neighborhood = neighborhoods.find((n) => n.slug === neighborhoodSlug);
      if (!neighborhood) {
        setState({ status: "forbidden" });
        return;
      }
      setState({ status: "ready", neighborhood, user });

      // Public profile (no auth needed) carries venue_count/poi_count/city/state
      // -- reused here rather than adding a new admin-only endpoint just for
      // the sidebar's location count and neighborhood card.
      fetch(clientApiUrl(`/neighborhoods/${neighborhoodSlug}`))
        .then((r) => (r.ok ? r.json() : null))
        .then((p) => {
          if (!cancelled && p) setProfile(p);
        });

      fetch(
        clientApiUrl(`/neighborhood-admin/neighborhoods/${neighborhood.neighborhood_id}/claims?status=pending`),
        { headers: { Authorization: `Bearer ${token}` } }
      )
        .then((r) => (r.ok ? r.json() : null))
        .then((claims) => {
          if (!cancelled && claims) setPendingClaimCount(claims.length);
        });
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [neighborhoodSlug]);

  if (state.status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <MushroomLoader size={88} />
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
            with a neighborhood admin account to manage this neighborhood.
          </p>
        )}
        {state.status === "forbidden" && (
          <p className="text-sm text-red-600 dark:text-red-400">
            This account isn&apos;t an admin of this neighborhood.
          </p>
        )}
        {state.status === "error" && <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>}
      </div>
    );
  }

  const { neighborhood, user } = state;
  const locationCount = profile ? profile.venue_count + profile.poi_count : null;

  async function handleLogOut() {
    await logOut();
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- deliberate hard reload: logOut() only clears the Supabase session + one cached-user variable, not every mounted component's own local state, so a client-side router.push() here could leave stale "still logged in" UI behind
    window.location.href = "/";
  }

  const shellTabs: AdminShellTab[] = TABS.map((tab) => {
    const href = `/admin/neighborhood/${neighborhoodSlug}${tab.href}`;
    // Sub-routes (e.g. locations/review) should keep their parent tab
    // highlighted -- exact-match only for Overview, whose own href is a
    // strict prefix of every other tab's.
    const active = tab.href === "" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
    let badge: React.ReactNode = null;
    if (tab.key === "locations" && locationCount !== null) {
      badge = <span className="ml-auto font-mono text-[10px] opacity-70">{locationCount}</span>;
    } else if (tab.key === "claims" && !!pendingClaimCount) {
      badge = (
        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-orange px-1 text-[11px] font-extrabold text-on-accent">
          {pendingClaimCount}
        </span>
      );
    }
    return { key: tab.key, href, label: tab.label, icon: tab.icon, active, badge };
  });

  return (
    <AdminShell
      switcherCurrent={{
        kind: "neighborhood",
        id: neighborhood.neighborhood_id,
        label: neighborhood.name,
        sublabel: profile ? `${profile.city}, ${profile.state}` : undefined,
      }}
      user={user}
      tabs={shellTabs}
      viewPublicHref={`/neighborhoods/${neighborhoodSlug}`}
      onLogOut={handleLogOut}
    >
      <NeighborhoodAdminProvider
        value={{
          neighborhoodId: neighborhood.neighborhood_id,
          slug: neighborhood.slug,
          name: neighborhood.name,
        }}
      >
        {children}
      </NeighborhoodAdminProvider>
    </AdminShell>
  );
}
