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
  { href: "/venues", label: "Venues" },
];

// Neighborhood profile pages (BACKLOG.md) + docs/url-map.md refactor: single
// enforcement point for the three neighborhood-admin tabs (Overview, Business
// claims, Venues -- category reassignment plus omission/reclassification,
// BACKLOG.md Ref 11). Resolves the route's slug against the list of
// neighborhoods this account administers -- admin-of-this-specific-neighborhood
// is still enforced server-side per route (neighborhoodAdminGate), this is
// just the client-side UX for loading/forbidden state and the tab nav itself.
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
      <a href="/neighborhood-admin" className="text-sm text-zinc-600 hover:underline dark:text-zinc-400">
        ← Neighborhood admin
      </a>

      {state.status === "loading" && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading…</p>
      )}

      {state.status === "signed_out" && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          <a href="/login" className="underline">
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
            <h1 className="text-xl font-semibold text-black dark:text-zinc-50">
              {state.neighborhood.name}
            </h1>
            <a
              href={`/neighborhoods/${state.neighborhood.slug}`}
              className="text-sm text-zinc-600 hover:underline dark:text-zinc-400"
            >
              View public page
            </a>
          </div>

          <nav className="flex gap-2 text-sm">
            {TABS.map((tab) => {
              const href = `/neighborhood-admin/${neighborhoodSlug}${tab.href}`;
              const isActive = pathname === href;
              return (
                <a
                  key={tab.href}
                  href={href}
                  className={`rounded-md px-3 py-1 ${
                    isActive
                      ? "bg-black text-white dark:bg-white dark:text-black"
                      : "border border-black/[.08] text-black dark:border-white/[.145] dark:text-zinc-50"
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
