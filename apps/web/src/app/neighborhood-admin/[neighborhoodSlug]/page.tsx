"use client";

import { useEffect, useState } from "react";
import type { Event, NeighborhoodDashboardSummary, SocialLinks } from "@blockwise/types";
import { getAccessToken } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";
import { useNeighborhoodAdmin } from "./NeighborhoodAdminContext";
import { DescriptionForm } from "./DescriptionForm";
import { EventForm } from "./EventForm";
import { SocialLinksForm } from "./SocialLinksForm";

type State =
  | { status: "loading" }
  | { status: "ready"; summary: NeighborhoodDashboardSummary }
  | { status: "error"; message: string };

// Overview tab of the neighborhood-admin dashboard (docs/url-map.md refactor
// -- was the whole of NeighborhoodAdminDashboard.tsx before Business claims
// and Venue categories became sibling tabs). Signed-in/forbidden handling now
// lives in layout.tsx, which is why this only tracks loading/ready/error.
export default function NeighborhoodAdminOverviewPage() {
  const { neighborhoodId, slug } = useNeighborhoodAdmin();
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const token = await getAccessToken();
      const res = await fetch(
        clientApiUrl(`/neighborhood-admin/neighborhoods/${neighborhoodId}/dashboard`),
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (cancelled) return;
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

  function handleSocialLinksSaved(socialLinks: SocialLinks) {
    setState((prev) =>
      prev.status === "ready" ? { ...prev, summary: { ...prev.summary, social_links: socialLinks } } : prev
    );
  }

  if (state.status === "loading") {
    return <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading…</p>;
  }
  if (state.status === "error") {
    return <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>;
  }

  return (
    <>
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
        <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Points of interest</h2>
        <a
          href={`/neighborhood-admin/${slug}/locations`}
          className="self-start text-sm text-zinc-600 hover:underline dark:text-zinc-400"
        >
          Manage in Locations tab →
        </a>
        {state.summary.pois.filter((poi) => poi.status === "active").length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-500">No points of interest yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {state.summary.pois
              .filter((poi) => poi.status === "active")
              .map((poi) => (
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
  );
}
