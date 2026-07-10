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
    return <p className="text-sm text-muted">Loading…</p>;
  }
  if (state.status === "error") {
    return <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>;
  }

  return (
    <>
      <section className="flex flex-col gap-2.5">
        <h2 className="text-xs font-extrabold tracking-wide text-muted uppercase">Description</h2>
        <DescriptionForm
          neighborhoodId={neighborhoodId}
          initialDescription={state.summary.description}
          onSaved={handleDescriptionSaved}
        />
      </section>

      <section className="flex flex-col gap-2.5">
        <h2 className="text-xs font-extrabold tracking-wide text-muted uppercase">Social links</h2>
        <SocialLinksForm
          neighborhoodId={neighborhoodId}
          initialSocialLinks={state.summary.social_links}
          onSaved={handleSocialLinksSaved}
        />
      </section>

      <section className="flex flex-col gap-2.5">
        <h2 className="text-xs font-extrabold tracking-wide text-muted uppercase">Events</h2>
        <EventForm neighborhoodId={neighborhoodId} onCreated={handleEventCreated} />
        {state.summary.events.length === 0 ? (
          <p className="text-sm text-muted">No events yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {state.summary.events.map((e) => (
              <li key={e.id} className="rounded-2xl bg-card-alt px-4 py-3 text-sm">
                <p className="font-extrabold text-foreground">{e.title}</p>
                <p className="text-muted">{e.description}</p>
                <p className="text-xs font-bold text-muted">
                  {new Date(e.start_time).toLocaleString()} – {new Date(e.end_time).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2.5">
        <h2 className="text-xs font-extrabold tracking-wide text-muted uppercase">Points of interest</h2>
        <a
          href={`/neighborhood-admin/${slug}/locations`}
          className="self-start text-sm font-bold text-brand-purple hover:text-brand-orange"
        >
          Manage in Locations tab →
        </a>
        {state.summary.pois.filter((poi) => poi.status === "active").length === 0 ? (
          <p className="text-sm text-muted">No points of interest yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {state.summary.pois
              .filter((poi) => poi.status === "active")
              .map((poi) => (
                <li key={poi.id} className="rounded-2xl bg-card-alt px-4 py-3 text-sm">
                  <span className="font-extrabold text-foreground">{poi.name}</span>
                  <span className="ml-2 text-muted">{poi.type}</span>
                  {poi.description && <p className="mt-1 text-muted">{poi.description}</p>}
                </li>
              ))}
          </ul>
        )}
      </section>
    </>
  );
}
