"use client";

import { useEffect, useState } from "react";
import type { BoundaryPreviewReport, GeoJsonPolygon, NeighborhoodBoundary } from "@blockwise/types";
import { getAccessToken } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";
import { useNeighborhoodAdmin } from "../NeighborhoodAdminContext";
import { BoundaryMap } from "../../BoundaryMap";

type LoadState =
  | { status: "loading" }
  | { status: "ready"; boundary: NeighborhoodBoundary }
  | { status: "error"; message: string };

type SaveStatus = { state: "idle" | "saving" | "saved" | "error"; message?: string };
type PreviewStatus = { state: "idle" | "loading" | "error"; message?: string };

// Admin portal boundary drawing (BACKLOG.md Ref 8, project plan §12.6): the
// same BoundaryMap tool as the create-neighborhood page, here loading and
// re-editing an *existing* neighborhood's boundary_geojson rather than
// starting from a blank map.
export default function NeighborhoodBoundaryPage() {
  const { neighborhoodId, slug } = useNeighborhoodAdmin();
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [polygon, setPolygon] = useState<GeoJsonPolygon | null>(null);
  const [preview, setPreview] = useState<BoundaryPreviewReport | null>(null);
  const [previewStatus, setPreviewStatus] = useState<PreviewStatus>({ state: "idle" });
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({ state: "idle" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const token = await getAccessToken();
      const res = await fetch(
        clientApiUrl(`/neighborhood-admin/neighborhoods/${neighborhoodId}/boundary`),
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (cancelled) return;
      if (!res.ok) {
        setLoadState({ status: "error", message: "Failed to load the neighborhood boundary" });
        return;
      }
      const boundary: NeighborhoodBoundary = await res.json();
      setPolygon(boundary.boundary_geojson);
      setLoadState({ status: "ready", boundary });
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    return () => {
      cancelled = true;
    };
  }, [neighborhoodId]);

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

  async function handleSave() {
    if (!polygon) return;
    setSaveStatus({ state: "saving" });
    try {
      const token = await getAccessToken();
      const res = await fetch(
        clientApiUrl(`/neighborhood-admin/neighborhoods/${neighborhoodId}/boundary`),
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ boundary_geojson: polygon }),
        }
      );
      const body = await res.json();
      if (!res.ok) {
        setSaveStatus({ state: "error", message: body.error ?? "Failed to save boundary" });
        return;
      }
      setSaveStatus({ state: "saved" });
    } catch {
      setSaveStatus({ state: "error", message: "Failed to save boundary" });
    }
  }

  if (loadState.status === "loading") {
    return <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading…</p>;
  }
  if (loadState.status === "error") {
    return <p className="text-sm text-red-600 dark:text-red-400">{loadState.message}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Drag any vertex to adjust the boundary, or clear it to draw a new one. The Google Places sync
        (BACKLOG.md) uses this shape to decide which venues belong to this neighborhood.
      </p>

      <BoundaryMap
        initialPolygon={loadState.boundary.boundary_geojson}
        initialCenter={{ lat: loadState.boundary.center_lat, lng: loadState.boundary.center_lng }}
        previewCandidates={preview?.candidates}
        onPolygonChange={(next) => {
          setPolygon(next);
          setPreview(null);
          setSaveStatus({ state: "idle" });
        }}
      />

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
        type="button"
        onClick={handleSave}
        disabled={!polygon || saveStatus.state === "saving"}
        className="self-start rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {saveStatus.state === "saving" ? "Saving…" : "Save boundary"}
      </button>
      {saveStatus.state === "saved" && (
        <p className="flex items-center gap-3 text-sm text-green-700 dark:text-green-400">
          Boundary saved.
          <a
            href={`/neighborhood-admin/${slug}/locations/review`}
            className="rounded-md border border-black/[.08] px-3 py-1 text-black dark:border-white/[.145] dark:text-zinc-50"
          >
            Review changes now →
          </a>
        </p>
      )}
      {saveStatus.state === "error" && (
        <p className="text-sm text-red-600 dark:text-red-400">{saveStatus.message}</p>
      )}
    </div>
  );
}
