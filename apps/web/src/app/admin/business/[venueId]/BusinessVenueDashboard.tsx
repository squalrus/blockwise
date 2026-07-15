"use client";

import { useEffect, useState } from "react";
import type { Announcement, Event, SocialLinks, VenueDashboardSummary } from "@blockwise/types";
import { getAccessToken } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";
import { StatTile, MushroomIcon } from "../../../StatTile";
import { useBusinessAdmin } from "./BusinessAdminContext";
import { AnnouncementForm } from "./AnnouncementForm";
import { EventForm } from "./EventForm";
import { SocialLinksForm } from "./SocialLinksForm";

type State =
  | { status: "loading" }
  | { status: "ready"; summary: VenueDashboardSummary }
  | { status: "error"; message: string };

// Overview tab of the business admin shell (BACKLOG.md), restyled to match
// admin/neighborhood/[neighborhoodSlug]/page.tsx's Overview tab. Account-type
// and claim-ownership gating live in layout.tsx now, so this only tracks the
// dashboard-data fetch itself.
export function BusinessVenueDashboard() {
  const { venueId } = useBusinessAdmin();
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const token = await getAccessToken();
      const res = await fetch(clientApiUrl(`/business/venues/${venueId}/dashboard`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (cancelled) return;
      if (!res.ok) {
        setState({ status: "error", message: "Failed to load venue dashboard" });
        return;
      }
      setState({ status: "ready", summary: await res.json() });
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    return () => {
      cancelled = true;
    };
  }, [venueId]);

  function handleAnnouncementCreated(announcement: Announcement) {
    setState((prev) =>
      prev.status === "ready"
        ? { ...prev, summary: { ...prev.summary, announcements: [announcement, ...prev.summary.announcements] } }
        : prev
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
    <div className="flex flex-col gap-5.5">
      <div>
        <h1 className="font-heading text-4xl font-extrabold">{state.summary.name}</h1>
        <p className="mt-1 text-[15px] text-body-text">{state.summary.address}</p>
      </div>

      <div className="grid max-w-md grid-cols-2 gap-3.5">
        <StatTile
          icon={<MushroomIcon color="var(--brand-orange)" />}
          label="Followers"
          value={state.summary.follower_count}
          color="var(--brand-orange)"
        />
        <StatTile
          icon={<MushroomIcon color="var(--brand-green)" />}
          label="Check-ins"
          value={state.summary.checkin_count}
          color="var(--brand-green)"
        />
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="flex flex-col gap-5">
          <section className="rounded-3xl border border-border bg-card p-6">
            <h2 className="mb-4 font-heading text-lg font-extrabold">Social links</h2>
            <SocialLinksForm
              venueId={venueId}
              initialSocialLinks={state.summary.social_links}
              onSaved={handleSocialLinksSaved}
            />
          </section>

          <section className="rounded-3xl border border-border bg-card p-6">
            <div className="mb-3.5 flex items-baseline gap-2.5">
              <h2 className="font-heading text-lg font-extrabold">Announcements</h2>
              <span className="font-mono text-[11px] text-muted">{state.summary.announcements.length} posted</span>
            </div>
            <AnnouncementForm venueId={venueId} onCreated={handleAnnouncementCreated} />
            {state.summary.announcements.length === 0 ? (
              <p className="mt-3 text-sm text-muted">No announcements yet.</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {state.summary.announcements.map((a) => (
                  <li key={a.id} className="rounded-2xl bg-card-alt px-4 py-3 text-sm">
                    <p className="font-extrabold text-foreground">{a.title}</p>
                    <p className="text-muted">{a.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="flex flex-col gap-5">
          <section className="rounded-3xl border border-border bg-card p-6">
            <div className="mb-3.5 flex items-baseline gap-2.5">
              <h2 className="font-heading text-lg font-extrabold">Events</h2>
              <span className="font-mono text-[11px] text-muted">{state.summary.events.length} upcoming</span>
            </div>
            <EventForm venueId={venueId} onCreated={handleEventCreated} />
            {state.summary.events.length === 0 ? (
              <p className="mt-3 text-sm text-muted">No events yet.</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {state.summary.events.map((e) => (
                  <li key={e.id} className="rounded-2xl bg-card-alt px-4 py-3 text-sm">
                    <p className="font-extrabold text-foreground">{e.title}</p>
                    <p className="text-muted">{e.description}</p>
                    <p className="mt-1 font-mono text-xs text-muted">
                      {new Date(e.start_time).toLocaleString()} – {new Date(e.end_time).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
