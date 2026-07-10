"use client";

import { useEffect, useState } from "react";
import type { Announcement, AppUser, Event, SocialLinks, VenueDashboardSummary } from "@blockwise/types";
import { getAccessToken, getCurrentUser } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";
import { StatCard } from "../../StatCard";
import { AnnouncementForm } from "./AnnouncementForm";
import { EventForm } from "./EventForm";
import { SocialLinksForm } from "./SocialLinksForm";

type State =
  | { status: "loading" }
  | { status: "signed_out" }
  | { status: "wrong_account_type" }
  | { status: "forbidden" }
  | { status: "ready"; summary: VenueDashboardSummary }
  | { status: "error"; message: string };

// Business owner venue dashboard (BACKLOG.md): the per-venue view a claimed
// business owner lands on from /business's venue list -- follower/check-in
// stats plus authoring for this venue's announcements and events. Ownership
// of this specific venue is enforced server-side (requireVenueOwner on GET
// /business/venues/:id/dashboard), not just "signed in as a business
// account" -- the "forbidden" state below is what a non-owner business
// account sees if it navigates here directly.
export function BusinessVenueDashboard({ venueId }: { venueId: string }) {
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
      const res = await fetch(clientApiUrl(`/business/venues/${venueId}/dashboard`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (cancelled) return;
      if (res.status === 403) {
        setState({ status: "forbidden" });
        return;
      }
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

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 font-sans sm:p-16">
      <a href="/business" className="text-sm font-bold text-brand-purple hover:text-brand-orange">
        ← Business portal
      </a>

      {state.status === "loading" && <p className="text-sm text-muted">Loading…</p>}

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
          This account isn&apos;t a business account. Upgrade it from the{" "}
          <a href="/business" className="font-bold text-brand-purple hover:text-brand-orange">
            business portal
          </a>{" "}
          first.
        </p>
      )}

      {state.status === "forbidden" && (
        <p className="text-sm text-red-600 dark:text-red-400">
          This account doesn&apos;t have an approved claim on this venue.
        </p>
      )}

      {state.status === "error" && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>
      )}

      {state.status === "ready" && (
        <>
          <div>
            <h1 className="font-heading text-xl font-extrabold text-foreground">{state.summary.name}</h1>
            <p className="text-sm text-muted">{state.summary.address}</p>
          </div>

          <div className="flex gap-2.5">
            <StatCard value={state.summary.follower_count} label="Followers" accent="orange" />
            <StatCard value={state.summary.checkin_count} label="Check-ins" accent="green" />
          </div>

          <section className="flex flex-col gap-2.5">
            <h2 className="text-xs font-extrabold tracking-wide text-muted uppercase">Social links</h2>
            <SocialLinksForm
              venueId={venueId}
              initialSocialLinks={state.summary.social_links}
              onSaved={handleSocialLinksSaved}
            />
          </section>

          <section className="flex flex-col gap-2.5">
            <h2 className="text-xs font-extrabold tracking-wide text-muted uppercase">Announcements</h2>
            <AnnouncementForm venueId={venueId} onCreated={handleAnnouncementCreated} />
            {state.summary.announcements.length === 0 ? (
              <p className="text-sm text-muted">No announcements yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {state.summary.announcements.map((a) => (
                  <li key={a.id} className="rounded-2xl bg-card-alt px-4 py-3 text-sm">
                    <p className="font-extrabold text-foreground">{a.title}</p>
                    <p className="text-muted">{a.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="flex flex-col gap-2.5">
            <h2 className="text-xs font-extrabold tracking-wide text-muted uppercase">Events</h2>
            <EventForm venueId={venueId} onCreated={handleEventCreated} />
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
        </>
      )}
    </div>
  );
}
