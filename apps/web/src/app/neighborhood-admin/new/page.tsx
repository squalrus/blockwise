"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { BoundaryPreviewReport, CreateNeighborhoodResponse, GeoJsonPolygon } from "@blockwise/types";
import { getAccessToken } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";
import { BoundaryMap } from "../BoundaryMap";

type Status = { state: "idle" | "submitting" | "error"; message?: string };
type PreviewStatus = { state: "idle" | "loading" | "error"; message?: string };

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Onboarding runbook (project plan §12.3 step 1): name/slug/city/state/
// timezone and the drawn boundary are created together in one step, always
// starting in 'onboarding' status -- flipping to 'active' is a separate,
// deliberate action once venue data is clean (not exposed here).
export default function NewNeighborhoodPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [city, setCity] = useState("");
  const [state, setStateField] = useState("");
  const [country, setCountry] = useState("US");
  const [timezone, setTimezone] = useState("America/Los_Angeles");
  const [polygon, setPolygon] = useState<GeoJsonPolygon | null>(null);
  const [preview, setPreview] = useState<BoundaryPreviewReport | null>(null);
  const [previewStatus, setPreviewStatus] = useState<PreviewStatus>({ state: "idle" });
  const [status, setStatus] = useState<Status>({ state: "idle" });

  function handleNameChange(value: string) {
    setName(value);
    if (!slugEdited) setSlug(slugify(value));
  }

  async function handlePreview() {
    if (!polygon) return;
    setPreviewStatus({ state: "loading" });
    try {
      const token = await getAccessToken();
      const res = await fetch(clientApiUrl("/admin/neighborhoods/preview-boundary"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ boundary_geojson: polygon }),
      });
      const body = await res.json();
      if (!res.ok) {
        setPreviewStatus({ state: "error", message: body.error ?? "Failed to preview boundary" });
        return;
      }
      setPreview(body);
      setPreviewStatus({ state: "idle" });
    } catch {
      setPreviewStatus({ state: "error", message: "Failed to preview boundary" });
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!polygon) return;
    setStatus({ state: "submitting" });

    try {
      const token = await getAccessToken();
      const res = await fetch(clientApiUrl("/admin/neighborhoods"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name,
          slug,
          city,
          state,
          country,
          timezone,
          boundary_geojson: polygon,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setStatus({ state: "error", message: body.error ?? "Failed to create neighborhood" });
        return;
      }
      const created: CreateNeighborhoodResponse = body;
      router.push(`/neighborhood-admin/${created.slug}`);
    } catch {
      setStatus({ state: "error", message: "Failed to create neighborhood" });
    }
  }

  const canSubmit = name.trim() && slug.trim() && city.trim() && state.trim() && country.trim() && timezone.trim() && polygon;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 font-sans sm:p-16">
      <a href="/neighborhood-admin" className="text-sm text-zinc-600 hover:underline dark:text-zinc-400">
        ← Neighborhood admin
      </a>

      <h1 className="text-xl font-semibold text-black dark:text-zinc-50">New neighborhood</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            Name
            <input
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
              className="rounded-md border border-black/[.08] px-3 py-2 dark:border-white/[.145] dark:bg-transparent"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Slug
            <input
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugEdited(true);
              }}
              required
              pattern="[a-z0-9-]+"
              className="rounded-md border border-black/[.08] px-3 py-2 dark:border-white/[.145] dark:bg-transparent"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            City
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
              className="rounded-md border border-black/[.08] px-3 py-2 dark:border-white/[.145] dark:bg-transparent"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            State
            <input
              value={state}
              onChange={(e) => setStateField(e.target.value)}
              required
              className="rounded-md border border-black/[.08] px-3 py-2 dark:border-white/[.145] dark:bg-transparent"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Country
            <input
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              required
              className="rounded-md border border-black/[.08] px-3 py-2 dark:border-white/[.145] dark:bg-transparent"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Timezone (IANA)
            <input
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              required
              placeholder="America/Los_Angeles"
              className="rounded-md border border-black/[.08] px-3 py-2 dark:border-white/[.145] dark:bg-transparent"
            />
          </label>
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-black dark:text-zinc-50">
            Draw the neighborhood boundary
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Pan/zoom to the area, then click to place vertices around the streets that define the
            neighborhood. Drag any vertex to adjust it afterward.
          </p>
          <BoundaryMap
            initialPolygon={null}
            previewCandidates={preview?.candidates}
            onPolygonChange={(next) => {
              setPolygon(next);
              setPreview(null);
            }}
          />
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handlePreview}
            disabled={!polygon || previewStatus.state === "loading"}
            className="self-start rounded-md border border-black/[.08] px-4 py-2 text-sm font-medium text-black disabled:opacity-50 dark:border-white/[.145] dark:text-zinc-50"
          >
            {previewStatus.state === "loading" ? "Previewing…" : "Preview venues in this area"}
          </button>
          {previewStatus.state === "error" && (
            <p className="text-sm text-red-600 dark:text-red-400">{previewStatus.message}</p>
          )}
          {preview && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Found {preview.candidates.length} venue{preview.candidates.length === 1 ? "" : "s"} in this
              boundary ({preview.tiles_queried} tile{preview.tiles_queried === 1 ? "" : "s"} queried,{" "}
              {preview.api_calls_made} Places API call{preview.api_calls_made === 1 ? "" : "s"}).
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={!canSubmit || status.state === "submitting"}
          className="self-start rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {status.state === "submitting" ? "Creating…" : "Create neighborhood"}
        </button>
        {status.state === "error" && (
          <p className="text-sm text-red-600 dark:text-red-400">{status.message}</p>
        )}
      </form>
    </div>
  );
}
