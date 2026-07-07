"use client";

import { useState } from "react";
import type { Event } from "@blockwise/types";
import { getAccessToken } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";

type Status = { state: "idle" | "submitting" | "error"; message?: string };

// Neighborhood-scoped counterpart to business/[venueId]/EventForm.tsx --
// same shape, posting to the neighborhood-admin authoring route instead of
// the venue one.
export function EventForm({
  neighborhoodId,
  onCreated,
}: {
  neighborhoodId: string;
  onCreated: (event: Event) => void;
}) {
  const [status, setStatus] = useState<Status>({ state: "idle" });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus({ state: "submitting" });

    const form = e.currentTarget;
    const data = new FormData(form);
    const startTimeLocal = String(data.get("start_time") ?? "");
    const endTimeLocal = String(data.get("end_time") ?? "");
    const body = {
      title: String(data.get("title") ?? ""),
      description: String(data.get("description") ?? ""),
      // datetime-local inputs give a value with no timezone offset -- new
      // Date() interprets that as local time, which is what the person
      // filling out the form meant.
      start_time: new Date(startTimeLocal).toISOString(),
      end_time: new Date(endTimeLocal).toISOString(),
    };

    try {
      const token = await getAccessToken();
      const res = await fetch(
        clientApiUrl(`/neighborhood-admin/neighborhoods/${neighborhoodId}/events`),
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(body),
        }
      );
      const responseBody = await res.json();

      if (res.status === 201) {
        onCreated(responseBody as Event);
        setStatus({ state: "idle" });
        form.reset();
      } else {
        setStatus({ state: "error", message: responseBody.error ?? "Failed to create event" });
      }
    } catch {
      setStatus({ state: "error", message: "Failed to create event" });
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-lg border border-black/[.08] px-6 py-4 dark:border-white/[.145]"
    >
      <input
        name="title"
        required
        placeholder="Title"
        className="rounded-md border border-black/[.08] px-3 py-2 text-sm dark:border-white/[.145] dark:bg-transparent"
      />
      <textarea
        name="description"
        required
        placeholder="Describe the event"
        rows={2}
        className="rounded-md border border-black/[.08] px-3 py-2 text-sm dark:border-white/[.145] dark:bg-transparent"
      />
      <div className="flex gap-2">
        <label className="flex flex-1 flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
          Starts
          <input
            type="datetime-local"
            name="start_time"
            required
            className="rounded-md border border-black/[.08] px-3 py-2 text-sm dark:border-white/[.145] dark:bg-transparent"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
          Ends
          <input
            type="datetime-local"
            name="end_time"
            required
            className="rounded-md border border-black/[.08] px-3 py-2 text-sm dark:border-white/[.145] dark:bg-transparent"
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={status.state === "submitting"}
        className="self-start rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {status.state === "submitting" ? "Creating…" : "Create event"}
      </button>
      {status.state === "error" && (
        <p className="text-sm text-red-600 dark:text-red-400">{status.message}</p>
      )}
    </form>
  );
}
