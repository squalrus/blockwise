"use client";

import { useState } from "react";
import { getAccessToken } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";

type Status = { state: "idle" | "submitting" | "error"; message?: string };

export function DescriptionForm({
  neighborhoodId,
  initialDescription,
  onSaved,
}: {
  neighborhoodId: string;
  initialDescription: string | null;
  onSaved: (description: string | null) => void;
}) {
  const [status, setStatus] = useState<Status>({ state: "idle" });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus({ state: "submitting" });

    const form = e.currentTarget;
    const data = new FormData(form);
    const description = String(data.get("description") ?? "");

    try {
      const token = await getAccessToken();
      const res = await fetch(clientApiUrl(`/neighborhood-admin/neighborhoods/${neighborhoodId}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ description }),
      });
      const responseBody = await res.json();

      if (res.ok) {
        onSaved(responseBody.description ?? null);
        setStatus({ state: "idle" });
      } else {
        setStatus({ state: "error", message: responseBody.error ?? "Failed to save description" });
      }
    } catch {
      setStatus({ state: "error", message: "Failed to save description" });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-xl bg-card-alt px-6 py-4">
      <textarea
        name="description"
        defaultValue={initialDescription ?? ""}
        placeholder="Tell visitors what makes this neighborhood worth a trip"
        rows={3}
        className="rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground"
      />
      <button
        type="submit"
        disabled={status.state === "submitting"}
        className="self-start rounded-md bg-brand-purple px-4 py-2 text-sm font-bold text-on-accent disabled:opacity-50"
      >
        {status.state === "submitting" ? "Saving…" : "Save description"}
      </button>
      {status.state === "error" && (
        <p className="text-sm text-red-600 dark:text-red-400">{status.message}</p>
      )}
    </form>
  );
}
