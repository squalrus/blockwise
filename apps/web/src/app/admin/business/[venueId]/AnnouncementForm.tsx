"use client";

import { useState } from "react";
import type { Announcement } from "@blockwise/types";
import { getAccessToken } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";

type Status = { state: "idle" | "submitting" | "error"; message?: string };

export function AnnouncementForm({
  venueId,
  onCreated,
}: {
  venueId: string;
  onCreated: (announcement: Announcement) => void;
}) {
  const [status, setStatus] = useState<Status>({ state: "idle" });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus({ state: "submitting" });

    const form = e.currentTarget;
    const data = new FormData(form);
    const body = {
      title: String(data.get("title") ?? ""),
      body: String(data.get("body") ?? ""),
    };

    try {
      const token = await getAccessToken();
      const res = await fetch(clientApiUrl(`/business/venues/${venueId}/announcements`), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const responseBody = await res.json();

      if (res.status === 201) {
        onCreated(responseBody as Announcement);
        setStatus({ state: "idle" });
        form.reset();
      } else {
        setStatus({ state: "error", message: responseBody.error ?? "Failed to create announcement" });
      }
    } catch {
      setStatus({ state: "error", message: "Failed to create announcement" });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2.5 rounded-2xl bg-card-alt p-4">
      <input
        name="title"
        required
        placeholder="Title"
        className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
      />
      <textarea
        name="body"
        required
        placeholder="What do you want to tell your followers?"
        rows={2}
        className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
      />
      <button
        type="submit"
        disabled={status.state === "submitting"}
        className="self-start rounded-xl bg-brand-purple px-5 py-2.5 font-heading text-sm font-bold text-on-accent disabled:opacity-50"
      >
        {status.state === "submitting" ? "Posting…" : "Post announcement"}
      </button>
      {status.state === "error" && (
        <p className="text-sm text-red-600 dark:text-red-400">{status.message}</p>
      )}
    </form>
  );
}
