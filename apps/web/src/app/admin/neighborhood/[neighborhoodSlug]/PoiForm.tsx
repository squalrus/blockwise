"use client";

import { useState } from "react";
import type { LocationKind, Venue } from "@blockwise/types";
import { getAccessToken } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";

type Status = { state: "idle" | "submitting" | "error"; message?: string };

export function PoiForm({
  neighborhoodId,
  kind = "poi",
  onCreated,
  onUpdated,
  onCancel,
  existing,
}: {
  neighborhoodId: string;
  // Create mode only -- which kind of location to create (AddLocationModal's
  // POI/Business toggle); ignored in edit mode, where kind is fixed to
  // `existing.kind` and changed only via the row's own "→ Business"/"→ POI"
  // switch-kind action, never through this form.
  kind?: LocationKind;
  onCreated?: (location: Venue) => void;
  // Edit mode (BACKLOG.md Ref 29): when `existing` is set, submitting PATCHes
  // that location instead of POSTing a new one, reusing the same fields/layout.
  onUpdated?: (location: Venue) => void;
  onCancel?: () => void;
  existing?: Venue;
}) {
  const [status, setStatus] = useState<Status>({ state: "idle" });
  const isEdit = existing !== undefined;
  const label = (isEdit ? existing.kind : kind) === "business" ? "business" : "point of interest";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus({ state: "submitting" });

    const form = e.currentTarget;
    const data = new FormData(form);
    const body = {
      ...(isEdit ? {} : { kind }),
      name: String(data.get("name") ?? ""),
      description: String(data.get("description") ?? "") || undefined,
      address: String(data.get("address") ?? "") || undefined,
      lat: Number(data.get("lat")),
      lng: Number(data.get("lng")),
    };

    try {
      const token = await getAccessToken();
      const url = isEdit
        ? clientApiUrl(`/neighborhood-admin/neighborhoods/${neighborhoodId}/locations/${existing.id}`)
        : clientApiUrl(`/neighborhood-admin/neighborhoods/${neighborhoodId}/locations`);
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const responseBody = await res.json();

      if (res.ok) {
        if (isEdit) {
          onUpdated?.(responseBody as Venue);
        } else {
          onCreated?.(responseBody as Venue);
          form.reset();
        }
        setStatus({ state: "idle" });
      } else {
        setStatus({
          state: "error",
          message: responseBody.error ?? `Failed to ${isEdit ? "update" : "create"} ${label}`,
        });
      }
    } catch {
      setStatus({ state: "error", message: `Failed to ${isEdit ? "update" : "create"} ${label}` });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-xl bg-card-alt px-6 py-4">
      <input
        name="name"
        required
        defaultValue={existing?.name}
        placeholder={label === "business" ? "Name (e.g. The Daily Grind)" : "Name (e.g. Woodland Park)"}
        className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
      />
      <textarea
        name="description"
        defaultValue={existing?.description ?? ""}
        placeholder="Optional description"
        rows={2}
        className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
      />
      <input
        name="address"
        defaultValue={existing?.address ?? ""}
        placeholder="Optional address"
        className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
      />
      <div className="flex gap-3">
        <input
          name="lat"
          type="number"
          step="any"
          required
          defaultValue={existing?.lat ?? undefined}
          placeholder="Latitude"
          className="w-1/2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
        />
        <input
          name="lng"
          type="number"
          step="any"
          required
          defaultValue={existing?.lng ?? undefined}
          placeholder="Longitude"
          className="w-1/2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={status.state === "submitting"}
          className="self-start rounded-md bg-brand-purple px-4 py-2 text-sm font-bold text-on-accent disabled:opacity-50"
        >
          {status.state === "submitting"
            ? isEdit
              ? "Saving…"
              : "Adding…"
            : isEdit
              ? "Save changes"
              : `Add ${label}`}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-border px-3 py-2 text-sm font-bold text-foreground hover:bg-card"
          >
            Cancel
          </button>
        )}
      </div>
      {status.state === "error" && (
        <p className="text-sm text-red-600 dark:text-red-400">{status.message}</p>
      )}
    </form>
  );
}
