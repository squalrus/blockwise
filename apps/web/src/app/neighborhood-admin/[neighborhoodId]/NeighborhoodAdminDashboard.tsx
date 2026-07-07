"use client";

import { useEffect, useState } from "react";
import type { AppUser, Event, NeighborhoodDashboardSummary, Poi, SocialLinks } from "@blockwise/types";
import { getAccessToken, getCurrentUser } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";
import { DescriptionForm } from "./DescriptionForm";
import { EventForm } from "./EventForm";
import { PoiForm } from "./PoiForm";
import { SocialLinksForm } from "./SocialLinksForm";

type State =
  | { status: "loading" }
  | { status: "signed_out" }
  | { status: "forbidden" }
  | { status: "ready"; summary: NeighborhoodDashboardSummary }
  | { status: "error"; message: string };

// Neighborhood profile pages (BACKLOG.md): the per-neighborhood view a
// neighborhood admin lands on from /neighborhood-admin's list -- description
// editing plus authoring for this neighborhood's own POIs and events.
// Admin-of-this-specific-neighborhood is enforced server-side
// (requireNeighborhoodAdmin on GET .../dashboard), not just "a neighborhood
// admin somewhere" -- the "forbidden" state below is what a different
// neighborhood's admin sees if they navigate here directly. Mirrors
// business/[venueId]/BusinessVenueDashboard.tsx.
export function NeighborhoodAdminDashboard({ neighborhoodId }: { neighborhoodId: string }) {
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
      const res = await fetch(
        clientApiUrl(`/neighborhood-admin/neighborhoods/${neighborhoodId}/dashboard`),
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (cancelled) return;
      if (res.status === 403) {
        setState({ status: "forbidden" });
        return;
      }
      if (!res.ok) {
        setState({ status: "error", message: "Failed to load neighborhood dashboard" });
        return;
      }
      setState({ status: "ready", summary: await res.json() });
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    return () => {
      cancelled = true;
    };
  }, [neighborhoodId]);

  function handleDescriptionSaved(description: string | null) {
    setState((prev) =>
      prev.status === "ready" ? { ...prev, summary: { ...prev.summary, description } } : prev
    );
  }

  function handleEventCreated(event: Event) {
    setState((prev) =>
      prev.status === "ready"
        ? { ...prev, summary: { ...prev.summary, events: [...prev.summary.events, event] } }
        : prev
    );
  }

  function handlePoiCreated(poi: Poi) {
    setState((prev) =>
      prev.status === "ready"
        ? { ...prev, summary: { ...prev.summary, pois: [...prev.summary.pois, poi] } }
        : prev
    );
  }

  function handleSocialLinksSaved(socialLinks: SocialLinks) {
    setState((prev) =>
      prev.status === "ready" ? { ...prev, summary: { ...prev.summary, social_links: socialLinks } } : prev
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-16 font-sans">
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
              {state.summary.name}
            </h1>
            <a
              href={`/neighborhoods/${state.summary.slug}`}
              className="text-sm text-zinc-600 hover:underline dark:text-zinc-400"
            >
              View public page
            </a>
          </div>

          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Description</h2>
            <DescriptionForm
              neighborhoodId={neighborhoodId}
              initialDescription={state.summary.description}
              onSaved={handleDescriptionSaved}
            />
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Social links</h2>
            <SocialLinksForm
              neighborhoodId={neighborhoodId}
              initialSocialLinks={state.summary.social_links}
              onSaved={handleSocialLinksSaved}
            />
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Events</h2>
            <EventForm neighborhoodId={neighborhoodId} onCreated={handleEventCreated} />
            {state.summary.events.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-500">No events yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {state.summary.events.map((e) => (
                  <li
                    key={e.id}
                    className="rounded-lg border border-black/[.08] px-4 py-3 text-sm dark:border-white/[.145]"
                  >
                    <p className="font-medium text-black dark:text-zinc-50">{e.title}</p>
                    <p className="text-zinc-600 dark:text-zinc-400">{e.description}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-500">
                      {new Date(e.start_time).toLocaleString()} – {new Date(e.end_time).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
              Points of interest
            </h2>
            <PoiForm neighborhoodId={neighborhoodId} onCreated={handlePoiCreated} />
            {state.summary.pois.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-500">No points of interest yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {state.summary.pois.map((poi) => (
                  <li
                    key={poi.id}
                    className="rounded-lg border border-black/[.08] px-4 py-3 text-sm dark:border-white/[.145]"
                  >
                    <span className="font-medium text-black dark:text-zinc-50">{poi.name}</span>
                    <span className="ml-2 text-zinc-600 dark:text-zinc-400">{poi.type}</span>
                    {poi.description && (
                      <p className="mt-1 text-zinc-600 dark:text-zinc-400">{poi.description}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
