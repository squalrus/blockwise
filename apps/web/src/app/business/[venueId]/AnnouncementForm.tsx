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
        name="body"
        required
        placeholder="What do you want to tell your followers?"
        rows={2}
        className="rounded-md border border-black/[.08] px-3 py-2 text-sm dark:border-white/[.145] dark:bg-transparent"
      />
      <button
        type="submit"
        disabled={status.state === "submitting"}
        className="self-start rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {status.state === "submitting" ? "Posting…" : "Post announcement"}
      </button>
      {status.state === "error" && (
        <p className="text-sm text-red-600 dark:text-red-400">{status.message}</p>
      )}
    </form>
  );
}
