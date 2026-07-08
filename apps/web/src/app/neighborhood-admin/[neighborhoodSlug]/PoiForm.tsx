"use client";

import { useState } from "react";
import type { Poi } from "@blockwise/types";
import { getAccessToken } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";

type Status = { state: "idle" | "submitting" | "error"; message?: string };

export function PoiForm({
  neighborhoodId,
  onCreated,
  onUpdated,
  onCancel,
  initial,
  existing,
}: {
  neighborhoodId: string;
  onCreated?: (poi: Poi) => void;
  // Edit mode (BACKLOG.md Ref 29): when `existing` is set, submitting PATCHes
  // that POI instead of POSTing a new one, reusing the same fields/layout.
  onUpdated?: (poi: Poi) => void;
  onCancel?: () => void;
  // Prefills the form from an existing venue, e.g. "Convert to POI"
  // (BACKLOG.md Ref 11) -- googlePlaceId isn't user-editable, so it's
  // attached directly to the submitted body rather than read from a field.
  initial?: { name: string; lat: number; lng: number; address?: string; googlePlaceId?: string | null };
  existing?: Poi;
}) {
  const [status, setStatus] = useState<Status>({ state: "idle" });
  const isEdit = existing !== undefined;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus({ state: "submitting" });

    const form = e.currentTarget;
    const data = new FormData(form);
    const body = {
      name: String(data.get("name") ?? ""),
      type: String(data.get("type") ?? ""),
      description: String(data.get("description") ?? "") || undefined,
      address: String(data.get("address") ?? "") || undefined,
      lat: Number(data.get("lat")),
      lng: Number(data.get("lng")),
      ...(initial?.googlePlaceId ? { google_place_id: initial.googlePlaceId } : {}),
    };

    try {
      const token = await getAccessToken();
      const url = isEdit
        ? clientApiUrl(`/neighborhood-admin/neighborhoods/${neighborhoodId}/pois/${existing.id}`)
        : clientApiUrl(`/neighborhood-admin/neighborhoods/${neighborhoodId}/pois`);
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const responseBody = await res.json();

      if (res.ok) {
        if (isEdit) {
          onUpdated?.(responseBody as Poi);
        } else {
          onCreated?.(responseBody as Poi);
          form.reset();
        }
        setStatus({ state: "idle" });
      } else {
        setStatus({
          state: "error",
          message: responseBody.error ?? `Failed to ${isEdit ? "update" : "create"} point of interest`,
        });
      }
    } catch {
      setStatus({ state: "error", message: `Failed to ${isEdit ? "update" : "create"} point of interest` });
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-lg border border-black/[.08] px-6 py-4 dark:border-white/[.145]"
    >
      <input
        name="name"
        required
        defaultValue={existing?.name ?? initial?.name}
        placeholder="Name (e.g. Woodland Park)"
        className="rounded-md border border-black/[.08] px-3 py-2 text-sm dark:border-white/[.145] dark:bg-transparent"
      />
      <input
        name="type"
        required
        defaultValue={existing?.type}
        placeholder="Type (e.g. park, transit, landmark)"
        className="rounded-md border border-black/[.08] px-3 py-2 text-sm dark:border-white/[.145] dark:bg-transparent"
      />
      <textarea
        name="description"
        defaultValue={existing?.description ?? ""}
        placeholder="Optional description"
        rows={2}
        className="rounded-md border border-black/[.08] px-3 py-2 text-sm dark:border-white/[.145] dark:bg-transparent"
      />
      <input
        name="address"
        defaultValue={existing?.address ?? initial?.address ?? ""}
        placeholder="Optional address"
        className="rounded-md border border-black/[.08] px-3 py-2 text-sm dark:border-white/[.145] dark:bg-transparent"
      />
      <div className="flex gap-3">
        <input
          name="lat"
          type="number"
          step="any"
          required
          defaultValue={existing?.lat ?? initial?.lat ?? undefined}
          placeholder="Latitude"
          className="w-1/2 rounded-md border border-black/[.08] px-3 py-2 text-sm dark:border-white/[.145] dark:bg-transparent"
        />
        <input
          name="lng"
          type="number"
          step="any"
          required
          defaultValue={existing?.lng ?? initial?.lng ?? undefined}
          placeholder="Longitude"
          className="w-1/2 rounded-md border border-black/[.08] px-3 py-2 text-sm dark:border-white/[.145] dark:bg-transparent"
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={status.state === "submitting"}
          className="self-start rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {status.state === "submitting"
            ? isEdit
              ? "Saving…"
              : "Adding…"
            : isEdit
              ? "Save changes"
              : "Add point of interest"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-black/[.08] px-3 py-2 text-sm dark:border-white/[.145]"
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
