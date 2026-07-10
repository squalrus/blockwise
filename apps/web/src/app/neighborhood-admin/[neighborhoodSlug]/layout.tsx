"use client";

import { useEffect, useState } from "react";
import { usePathname, useParams } from "next/navigation";
import type { AppUser, NeighborhoodAdminSummary } from "@blockwise/types";
import { getAccessToken, getCurrentUser } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";
import { NeighborhoodAdminProvider } from "./NeighborhoodAdminContext";

type State =
  | { status: "loading" }
  | { status: "signed_out" }
  | { status: "forbidden" }
  | { status: "ready"; neighborhood: NeighborhoodAdminSummary }
  | { status: "error"; message: string };

const TABS = [
  { href: "", label: "Overview" },
  { href: "/boundary", label: "Boundary" },
  { href: "/claims", label: "Business claims" },
  { href: "/locations", label: "Locations" },
];

// Neighborhood profile pages (BACKLOG.md) + docs/url-map.md refactor: single
// enforcement point for the neighborhood-admin tabs (Overview, Business
// claims, Locations -- merged venue/POI management: category reassignment,
// omission/reclassification (BACKLOG.md Ref 11), and full POI CRUD (Ref 29)).
// Resolves the route's slug against the list of neighborhoods this account
// administers -- admin-of-this-specific-neighborhood is still enforced
// server-side per route (neighborhoodAdminGate), this is just the
// client-side UX for loading/forbidden state and the tab nav itself.
export default function NeighborhoodAdminLayout({ children }: { children: React.ReactNode }) {
  const { neighborhoodSlug } = useParams<{ neighborhoodSlug: string }>();
  const pathname = usePathname();
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
      setState({ status: "ready", neighborhood });
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    return () => {
      cancelled = true;
    };
  }, [neighborhoodSlug]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 font-sans sm:p-16">
      <a href="/neighborhood-admin" className="text-sm font-bold text-brand-purple hover:text-brand-orange">
        ← Neighborhood admin
      </a>

      {state.status === "loading" && <p className="text-sm text-muted">Loading…</p>}

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

      {state.status === "error" && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>
      )}

      {state.status === "ready" && (
        <>
          <div>
            <h1 className="font-heading text-xl font-extrabold text-foreground">{state.neighborhood.name}</h1>
            <a
              href={`/neighborhoods/${state.neighborhood.slug}`}
              className="text-sm font-bold text-brand-purple hover:text-brand-orange"
            >
              View public page
            </a>
          </div>

          <nav className="flex gap-2 overflow-x-auto pb-1 text-sm">
            {TABS.map((tab) => {
              const href = `/neighborhood-admin/${neighborhoodSlug}${tab.href}`;
              const isActive = pathname === href;
              return (
                <a
                  key={tab.href}
                  href={href}
                  className={`shrink-0 rounded-full px-4 py-2 font-extrabold whitespace-nowrap ${
                    isActive ? "bg-foreground text-ink" : "bg-card-alt text-muted"
                  }`}
                >
                  {tab.label}
                </a>
              );
            })}
          </nav>

          <NeighborhoodAdminProvider
            value={{
              neighborhoodId: state.neighborhood.neighborhood_id,
              slug: state.neighborhood.slug,
              name: state.neighborhood.name,
            }}
          >
            {children}
          </NeighborhoodAdminProvider>
        </>
      )}
    </div>
  );
}
