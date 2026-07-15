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
// starting from a blank map. Visually redesigned per BACKLOG.md Ref 31
// "SimCity-style redesign" -- the map/editing logic is unchanged.
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
    return <p className="text-sm text-muted">Loading…</p>;
  }
  if (loadState.status === "error") {
    return <p className="text-sm text-red-600 dark:text-red-400">{loadState.message}</p>;
  }

  // GeoJSON rings repeat their first point as the last one to close the
  // loop -- subtract 1 so "Vertices" reads as the number of draggable points
  // an admin actually placed, not the closed-ring point count.
  const vertexCount = polygon ? Math.max(polygon.coordinates[0].length - 1, 0) : 0;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-heading text-4xl font-extrabold">Boundary</h1>
        <p className="mt-1 text-[15px] text-body-text">
          Drag any vertex to adjust the boundary, or clear it to draw a new one. Venues inside the line belong to
          this neighborhood.
        </p>
      </div>

      <div className="flex flex-col items-stretch gap-5 lg:flex-row">
        <div className="min-h-[420px] flex-1 overflow-hidden rounded-3xl border border-border">
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
        </div>

        <div className="flex w-full flex-col gap-4 lg:w-78 lg:shrink-0">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 font-heading text-[17px] font-extrabold">This shape</h2>
            <div className="flex flex-col gap-2.5 text-[13px]">
              <div className="flex justify-between">
                <span className="font-bold text-muted-strong">Vertices</span>
                <span className="font-mono text-xs">{vertexCount}</span>
              </div>
              {preview && (
                <>
                  <div className="flex justify-between">
                    <span className="font-bold text-muted-strong">Venues found</span>
                    <span className="font-mono text-xs text-brand-green">{preview.candidates.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold text-muted-strong">Tiles queried</span>
                    <span className="font-mono text-xs">{preview.tiles_queried}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold text-muted-strong">Places API calls</span>
                    <span className="font-mono text-xs">{preview.api_calls_made}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-card-alt p-4.5 text-[13px] leading-relaxed text-body-text">
            The nightly Google Places sync uses this shape to decide which venues belong to this neighborhood.
            Redrawing takes effect on the next sync.
          </div>

          <div className="flex-1" />

          <button
            type="button"
            onClick={handlePreview}
            disabled={!polygon || previewStatus.state === "loading"}
            className="rounded-xl border border-border bg-card px-4 py-3 text-sm font-bold text-foreground hover:bg-card-alt disabled:opacity-50"
          >
            {previewStatus.state === "loading" ? "Previewing…" : "Preview venues in this area"}
          </button>
          {previewStatus.state === "error" && (
            <p className="text-sm text-red-600 dark:text-red-400">{previewStatus.message}</p>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={!polygon || saveStatus.state === "saving"}
            className="rounded-xl bg-brand-purple px-4 py-3.5 font-heading text-[15px] font-bold text-on-accent disabled:opacity-50"
          >
            {saveStatus.state === "saving" ? "Saving…" : "Save boundary"}
          </button>
          {saveStatus.state === "saved" && (
            <p className="flex flex-wrap items-center gap-3 text-sm text-brand-green">
              Boundary saved.
              <a
                href={`/admin/neighborhood/${slug}/locations/review`}
                className="rounded-md border border-border px-3 py-1 text-foreground hover:bg-card-alt"
              >
                Review changes now →
              </a>
            </p>
          )}
          {saveStatus.state === "error" && (
            <p className="text-sm text-red-600 dark:text-red-400">{saveStatus.message}</p>
          )}
        </div>
      </div>
    </div>
  );
}
