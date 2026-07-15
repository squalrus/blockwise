"use client";

import { useEffect, useRef, useState } from "react";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import type { BoundaryPreviewCandidate, GeoJsonPolygon } from "@blockwise/types";

// Falls back to Phinneywood when creating a brand-new neighborhood with no
// boundary (and no other center hint) yet -- just a reasonable place to
// start panning from, not otherwise meaningful.
const DEFAULT_CENTER = { lat: 47.6869, lng: -122.3554 };

// setOptions() must run exactly once before the first importLibrary() call
// (mirrors neighborhoods/[slug]/MapView.tsx's same guard).
let mapsOptionsSet = false;
function ensureMapsOptionsSet(apiKey: string) {
  if (mapsOptionsSet) return;
  setOptions({ key: apiKey, v: "weekly" });
  mapsOptionsSet = true;
}

// GeoJSON requires a closed ring (first position repeats as the last);
// google.maps.Polygon closes its path implicitly and would otherwise end up
// with a redundant, editable-but-meaningless final vertex.
function ringToLiterals(polygon: GeoJsonPolygon): google.maps.LatLngLiteral[] {
  return polygon.coordinates[0].slice(0, -1).map(([lng, lat]) => ({ lat, lng }));
}

function literalsToPolygon(points: google.maps.LatLngLiteral[]): GeoJsonPolygon | null {
  if (points.length < 3) return null;
  const coordinates = points.map((p) => [p.lng, p.lat]);
  coordinates.push(coordinates[0]);
  return { type: "Polygon", coordinates: [coordinates] };
}

function pathToLiterals(path: google.maps.MVCArray<google.maps.LatLng>): google.maps.LatLngLiteral[] {
  const out: google.maps.LatLngLiteral[] = [];
  path.forEach((latLng) => out.push({ lat: latLng.lat(), lng: latLng.lng() }));
  return out;
}

// Admin portal boundary drawing (BACKLOG.md Ref 8, project plan §12.6):
// click-to-place-vertex polygon drawing with drag-to-adjust editing, shared
// by both the create-neighborhood page and the per-neighborhood boundary
// edit tab.
//
// Google deprecated the Drawing library (google.maps.drawing.DrawingManager
// is no longer functional as of Maps JS API v3.65 -- @types/google.maps
// reflects this with an empty class body), so vertex placement is driven
// directly off the map's own click event and a plain editable
// google.maps.Polygon instead of DrawingManager.
//
// Reports the current drawn shape to the parent on every edit
// (onPolygonChange) rather than exposing an imperative "get current value"
// method, so the parent's submit button can simply disable itself on null.
export function BoundaryMap({
  initialPolygon,
  initialCenter,
  previewCandidates,
  onPolygonChange,
}: {
  initialPolygon: GeoJsonPolygon | null;
  initialCenter?: { lat: number; lng: number } | null;
  previewCandidates?: BoundaryPreviewCandidate[] | null;
  onPolygonChange: (polygon: GeoJsonPolygon | null) => void;
}) {
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const polygonClassRef = useRef<typeof google.maps.Polygon | null>(null);
  const markerClassRef = useRef<typeof google.maps.Marker | null>(null);
  const polygonRef = useRef<google.maps.Polygon | null>(null);
  const clickListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  const drawingPointsRef = useRef<google.maps.LatLngLiteral[]>([]);
  const previewMarkersRef = useRef<google.maps.Marker[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "no-key" | "error">("loading");
  const [drawing, setDrawing] = useState(!initialPolygon);
  const [drawingPointCount, setDrawingPointCount] = useState(0);

  // Component-scope (not effect-local) so handleClear can re-enter drawing
  // mode without duplicating this setup -- reads the map/Polygon class off
  // refs rather than parameters since both are stable once set.
  function startDrawing() {
    const map = mapRef.current;
    const Polygon = polygonClassRef.current;
    if (!map || !Polygon) return;

    clickListenerRef.current?.remove();
    polygonRef.current?.setMap(null);
    drawingPointsRef.current = [];
    setDrawingPointCount(0);
    setDrawing(true);
    onPolygonChange(null);

    const livePolygon = new Polygon({ paths: [], editable: false, map, fillOpacity: 0.15 });
    polygonRef.current = livePolygon;

    clickListenerRef.current = map.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      drawingPointsRef.current = [
        ...drawingPointsRef.current,
        { lat: e.latLng.lat(), lng: e.latLng.lng() },
      ];
      livePolygon.setPath(drawingPointsRef.current);
      setDrawingPointCount(drawingPointsRef.current.length);
    });
  }

  function makeEditable(polygon: google.maps.Polygon) {
    const path = polygon.getPath();
    const emit = () => onPolygonChange(literalsToPolygon(pathToLiterals(path)));
    path.addListener("insert_at", emit);
    path.addListener("remove_at", emit);
    path.addListener("set_at", emit);
    emit();
  }

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setStatus("no-key");
      return;
    }
    if (!mapDivRef.current) return;

    let cancelled = false;
    ensureMapsOptionsSet(apiKey);

    Promise.all([importLibrary("maps"), importLibrary("marker")])
      .then(([{ Map, Polygon }, { Marker }]) => {
        if (cancelled || !mapDivRef.current) return;

        polygonClassRef.current = Polygon;
        markerClassRef.current = Marker;

        const map = new Map(mapDivRef.current, {
          center: initialCenter ?? DEFAULT_CENTER,
          zoom: 15,
        });
        mapRef.current = map;

        if (initialPolygon) {
          const points = ringToLiterals(initialPolygon);
          const polygon = new Polygon({ paths: points, editable: true, map });
          polygonRef.current = polygon;
          makeEditable(polygon);

          // Fit the whole saved shape in view on load instead of the fixed
          // zoom=15 above, which cuts off anything bigger than a few blocks.
          const bounds = new google.maps.LatLngBounds();
          points.forEach((p) => bounds.extend(p));
          map.fitBounds(bounds, 24);
        } else {
          startDrawing();
        }

        setStatus("ready");
      })
      .catch((err) => {
        console.error("Failed to load Google Maps:", err);
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
      clickListenerRef.current?.remove();
      polygonRef.current?.setMap(null);
      previewMarkersRef.current.forEach((m) => m.setMap(null));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- map is built once at mount; initialPolygon/initialCenter are only read then
  }, []);

  // Layers dry-run preview markers on top once a report comes back, clearing
  // any markers left from a previous preview run first.
  useEffect(() => {
    if (status !== "ready" || !mapRef.current || !markerClassRef.current) return;
    const Marker = markerClassRef.current;
    const map = mapRef.current;

    previewMarkersRef.current.forEach((m) => m.setMap(null));
    previewMarkersRef.current = (previewCandidates ?? []).map(
      (candidate) => new Marker({ position: { lat: candidate.lat, lng: candidate.lng }, map, title: candidate.name })
    );
  }, [previewCandidates, status]);

  function handleFinishDrawing() {
    const map = mapRef.current;
    const Polygon = polygonClassRef.current;
    if (!map || !Polygon || drawingPointsRef.current.length < 3) return;

    clickListenerRef.current?.remove();
    clickListenerRef.current = null;
    polygonRef.current?.setMap(null);

    const polygon = new Polygon({ paths: drawingPointsRef.current, editable: true, map });
    polygonRef.current = polygon;
    setDrawing(false);
    makeEditable(polygon);
  }

  function handleClear() {
    startDrawing();
  }

  if (status === "no-key") {
    return (
      <p className="rounded-xl border border-border bg-card-alt px-4 py-3 text-sm text-muted">
        Boundary drawing requires <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to be configured (see{" "}
        <code>apps/web/.env.example</code>).
      </p>
    );
  }

  if (status === "error") {
    return (
      <p className="rounded-xl border border-border bg-card-alt px-4 py-3 text-sm text-muted">
        Couldn&apos;t load the map. Check your Google Maps API key and try again.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div ref={mapDivRef} className="h-[60vh] w-full rounded-xl border border-border" />
      <div className="flex items-center gap-3">
        {drawing ? (
          <>
            <p className="text-xs font-bold text-muted">
              Click the map to place vertices ({drawingPointCount} so far, 3+ required).
            </p>
            <button
              type="button"
              onClick={handleFinishDrawing}
              disabled={drawingPointCount < 3}
              className="rounded-md border border-border px-3 py-1 text-xs font-bold text-foreground disabled:opacity-50 hover:bg-card-alt"
            >
              Finish boundary
            </button>
          </>
        ) : (
          <button type="button" onClick={handleClear} className="text-xs font-bold text-brand-purple hover:text-brand-orange">
            Clear and redraw boundary
          </button>
        )}
      </div>
    </div>
  );
}
