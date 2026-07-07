"use client";

import { useEffect, useState } from "react";
import type { Announcement, AppUser, Event, SocialLinks, VenueDashboardSummary } from "@blockwise/types";
import { getAccessToken, getCurrentUser } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";
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
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-16 font-sans">
      <a href="/business" className="text-sm text-zinc-600 hover:underline dark:text-zinc-400">
        ← Business portal
      </a>

      {state.status === "loading" && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading…</p>
      )}

      {state.status === "signed_out" && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          <a href="/login" className="underline">
            Log in
          </a>{" "}
          with a business account to manage this venue.
        </p>
      )}

      {state.status === "wrong_account_type" && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          This account isn&apos;t a business account. Upgrade it from the{" "}
          <a href="/business" className="underline">
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
            <h1 className="text-xl font-semibold text-black dark:text-zinc-50">
              {state.summary.name}
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{state.summary.address}</p>
          </div>

          <div className="flex gap-6">
            <div className="rounded-lg border border-black/[.08] px-4 py-3 dark:border-white/[.145]">
              <p className="text-2xl font-semibold text-black dark:text-zinc-50">
                {state.summary.follower_count}
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Followers</p>
            </div>
            <div className="rounded-lg border border-black/[.08] px-4 py-3 dark:border-white/[.145]">
              <p className="text-2xl font-semibold text-black dark:text-zinc-50">
                {state.summary.checkin_count}
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Check-ins</p>
            </div>
          </div>

          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Social links</h2>
            <SocialLinksForm
              venueId={venueId}
              initialSocialLinks={state.summary.social_links}
              onSaved={handleSocialLinksSaved}
            />
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Announcements</h2>
            <AnnouncementForm venueId={venueId} onCreated={handleAnnouncementCreated} />
            {state.summary.announcements.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-500">No announcements yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {state.summary.announcements.map((a) => (
                  <li
                    key={a.id}
                    className="rounded-lg border border-black/[.08] px-4 py-3 text-sm dark:border-white/[.145]"
                  >
                    <p className="font-medium text-black dark:text-zinc-50">{a.title}</p>
                    <p className="text-zinc-600 dark:text-zinc-400">{a.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Events</h2>
            <EventForm venueId={venueId} onCreated={handleEventCreated} />
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
        </>
      )}
    </div>
  );
}
