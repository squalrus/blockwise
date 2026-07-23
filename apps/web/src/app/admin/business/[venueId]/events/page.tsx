"use client";

import { useEffect, useState } from "react";
import type { Event, VenueDashboardSummary } from "@blockwise/types";
import { MushroomLoader } from "@blockwise/ui";
import { getAccessToken } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";
import { useBusinessAdmin } from "../BusinessAdminContext";
import { EventForm } from "../EventForm";
import { IcalFeedForm } from "../IcalFeedForm";
import { EventListItem } from "../../../../EventListItem";

type State =
  | { status: "loading" }
  | { status: "ready"; summary: VenueDashboardSummary }
  | { status: "error"; message: string };

// Events tab, split out of the Overview tab the same way the
// neighborhood-admin Events tab was (BACKLOG.md Ref 78) -- mirrors that
// page's Calendar feed + Create event (left) / Upcoming list (right)
// layout, scoped to this venue instead of the whole neighborhood.
export default function BusinessEventsPage() {
  const { venueId, name } = useBusinessAdmin();
  const [state, setState] = useState<State>({ status: "loading" });

  async function load() {
    const token = await getAccessToken();
    const res = await fetch(clientApiUrl(`/business/venues/${venueId}/dashboard`), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      setState({ status: "error", message: "Failed to load events" });
      return;
    }
    setState({ status: "ready", summary: await res.json() });
  }

  useEffect(() => {
    let cancelled = false;
    async function run() {
      const token = await getAccessToken();
      const res = await fetch(clientApiUrl(`/business/venues/${venueId}/dashboard`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (cancelled) return;
      if (!res.ok) {
        setState({ status: "error", message: "Failed to load events" });
        return;
      }
      setState({ status: "ready", summary: await res.json() });
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    run();
    return () => {
      cancelled = true;
    };
  }, [venueId]);

  function handleEventCreated(event: Event) {
    setState((prev) =>
      prev.status === "ready"
        ? { ...prev, summary: { ...prev.summary, events: [...prev.summary.events, event] } }
        : prev
    );
  }

  async function handleDeleteEvent(eventId: string) {
    const token = await getAccessToken();
    const res = await fetch(clientApiUrl(`/business/venues/${venueId}/events/${eventId}`), {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    setState((prev) =>
      prev.status === "ready"
        ? { ...prev, summary: { ...prev.summary, events: prev.summary.events.filter((e) => e.id !== eventId) } }
        : prev
    );
  }

  // Hide survives a future iCal re-sync (unlike delete, which a re-sync
  // would just undo for an imported event), so it's the way to suppress one
  // specific event -- imported or manual -- without excluding it forever.
  async function handleToggleEventStatus(eventId: string, currentStatus: Event["status"]) {
    const nextStatus = currentStatus === "hidden" ? "active" : "hidden";
    const token = await getAccessToken();
    const res = await fetch(clientApiUrl(`/business/venues/${venueId}/events/${eventId}/status`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (!res.ok) return;
    const updated = (await res.json()) as Event;
    setState((prev) =>
      prev.status === "ready"
        ? {
            ...prev,
            summary: {
              ...prev.summary,
              events: prev.summary.events.map((e) => (e.id === eventId ? updated : e)),
            },
          }
        : prev
    );
  }

  if (state.status === "loading") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <MushroomLoader size={72} />
      </div>
    );
  }
  if (state.status === "error") {
    return <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>;
  }

  return (
    <div className="flex flex-col gap-5.5">
      <div>
        <h1 className="font-heading text-4xl font-extrabold">Events</h1>
        <p className="mt-1 text-[15px] text-body-text">
          What&apos;s happening at {name} — pulled from a calendar feed or added by hand.
        </p>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1fr_1.25fr]">
        <div className="flex flex-col gap-5">
          <section className="rounded-3xl border border-border bg-card p-6">
            <h2 className="mb-1 font-heading text-lg font-extrabold">Calendar feed</h2>
            <p className="mb-3.5 text-[13px] text-muted">
              Paste an iCal URL — sync now, or come back any time to pull in new events.
            </p>
            <IcalFeedForm
              venueId={venueId}
              initialFeedUrl={state.summary.ical_feed_url}
              initialSyncedAt={state.summary.ical_synced_at}
              onSynced={load}
            />
          </section>

          <section className="rounded-3xl border border-border bg-card p-6">
            <h2 className="mb-3.5 font-heading text-lg font-extrabold">Create event</h2>
            <EventForm venueId={venueId} onCreated={handleEventCreated} />
          </section>
        </div>

        <section className="rounded-3xl border border-border bg-card p-6">
          <div className="mb-3.5 flex items-baseline gap-2.5">
            <h2 className="font-heading text-lg font-extrabold">Upcoming</h2>
            <span className="font-mono text-[11px] text-muted">{state.summary.events.length} events</span>
          </div>
          {state.summary.events.length === 0 ? (
            <p className="text-sm text-muted">No events yet.</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {state.summary.events.map((e) => (
                <EventListItem
                  key={e.id}
                  event={e}
                  actions={
                    <>
                      <button
                        type="button"
                        onClick={() => handleToggleEventStatus(e.id, e.status)}
                        className="text-xs font-bold text-foreground hover:underline"
                      >
                        {e.status === "hidden" ? "Unhide" : "Hide"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteEvent(e.id)}
                        className="text-xs font-bold text-red-600 hover:underline dark:text-red-400"
                      >
                        Delete
                      </button>
                    </>
                  }
                />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
