"use client";

import { useRef, useState } from "react";
import Map, { Marker, NavigationControl, useControl, type MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import "@/lib/maplibreWorker";
import { collapseMapAttribution } from "@/lib/mapAttribution";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import type { Feature, Polygon } from "geojson";
import type { BoundaryPreviewCandidate, GeoJsonPolygon } from "@blockwise/types";

// Falls back to Phinneywood when creating a brand-new neighborhood with no
// boundary (and no other center hint) yet -- just a reasonable place to
// start panning from, not otherwise meaningful.
const DEFAULT_CENTER = { lat: 47.6869, lng: -122.3554 };

function styleUrl(apiKey: string): string {
  return `https://maps.geoapify.com/v1/styles/positron/style.json?apiKey=${apiKey}`;
}

// mapbox-gl-draw's bundled default theme (MapboxDraw.lib.theme) ships a
// "gl-draw-lines" layer whose line-dasharray case-expression outputs are
// bare arrays ([0.2, 2] / [2, 0]) -- valid under Mapbox GL JS's more lenient
// validator, but MapLibre's stricter one rejects them ("Expression name
// must be a string... If you wanted a literal array, use ['literal', ...]").
// Without this, map.addLayer() throws inside mapbox-gl-draw's own setup and
// surfaces as the map's generic 'error' event, which read as "the whole map
// failed to load" even though only the draw layers were broken. Patching
// the one property (rather than hand-maintaining a full copy of the theme)
// keeps everything else -- vertex/midpoint styling, colors -- exactly as
// mapbox-gl-draw ships it.
function maplibreCompatibleDrawStyles(): Record<string, unknown>[] {
  return MapboxDraw.lib.theme.map((layer) => {
    const paint = layer.paint as Record<string, unknown> | undefined;
    if (!paint || !("line-dasharray" in paint)) return layer;
    const [op, condition, ifTrue, ifFalse] = paint["line-dasharray"] as [
      string,
      unknown,
      number[],
      number[],
    ];
    return {
      ...layer,
      paint: {
        ...paint,
        "line-dasharray": [op, condition, ["literal", ifTrue], ["literal", ifFalse]],
      },
    };
  });
}

function polygonBounds(polygon: GeoJsonPolygon): [[number, number], [number, number]] {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  for (const [lng, lat] of polygon.coordinates[0]) {
    minLng = Math.min(minLng, lng);
    minLat = Math.min(minLat, lat);
    maxLng = Math.max(maxLng, lng);
    maxLat = Math.max(maxLat, lat);
  }
  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}

// mapbox-gl-draw always hands back a closed ring (first position repeats as
// last), the same convention GeoJsonPolygon already documents -- no
// stripping/re-closing needed, unlike the old google.maps.Polygon path which
// closed its ring implicitly and had to have the redundant point removed.
function drawFeatureToPolygon(feature: Feature<Polygon> | undefined): GeoJsonPolygon | null {
  const ring = feature?.geometry.coordinates[0];
  if (!ring || ring.length < 4) return null;
  return { type: "Polygon", coordinates: feature.geometry.coordinates };
}

// Admin portal boundary drawing (BACKLOG.md Ref 8, project plan §12.6):
// click-to-place-vertex polygon drawing with drag-to-adjust editing, shared
// by both the create-neighborhood page and the per-neighborhood boundary
// edit tab.
//
// Reports the current drawn shape to the parent on every edit
// (onPolygonChange) rather than exposing an imperative "get current value"
// method, so the parent's submit button can simply disable itself on null.
function DrawControl({
  initialPolygon,
  onPolygonChange,
}: {
  initialPolygon: GeoJsonPolygon | null;
  onPolygonChange: (polygon: GeoJsonPolygon | null) => void;
}) {
  const drawRef = useRef<MapboxDraw | null>(null);
  const emitRef = useRef<(() => void) | null>(null);

  // useControl's 2-callback overload treats a lone second argument as
  // *onRemove*, not onAdd (see its .d.ts overloads) -- passing onAdd logic
  // there ran it during unmount/cleanup instead, against a control whose
  // internal state had already been torn down. All setup belongs in the
  // explicit 3-arg (onCreate, onAdd, onRemove) form.
  //
  // The onCreate factory below is memoized via useMemo internally, and React
  // Strict Mode's dev-only double-render invokes useMemo factories twice --
  // if this factory just did `drawRef.current = new MapboxDraw(...)` on
  // every call, the second (discarded) invocation could leave drawRef
  // pointing at a MapboxDraw instance that was never actually passed to
  // map.addControl (so its internal ctx.store was never initialized,
  // crashing on the first draw.add/changeMode call). Guarding on
  // drawRef.current already being set makes the factory idempotent: every
  // invocation returns the same first-created instance, so the memoized
  // control and drawRef can never diverge.
  useControl<MapboxDraw>(
    () => {
      if (!drawRef.current) {
        drawRef.current = new MapboxDraw({
          displayControlsDefault: false,
          controls: { polygon: true, trash: true },
          styles: maplibreCompatibleDrawStyles(),
        });
      }
      return drawRef.current;
    },
    ({ map }) => {
      const draw = drawRef.current;
      if (!draw) return;

      if (initialPolygon) {
        draw.add(initialPolygon);
        draw.changeMode("simple_select");
        onPolygonChange(initialPolygon);
      } else {
        draw.changeMode("draw_polygon");
      }

      // mapbox-gl-draw's control container keeps mapbox-gl's classes
      // ("mapboxgl-ctrl-group"/"mapboxgl-ctrl") rather than maplibre-gl's
      // renamed ones. maplibre-gl.css sets `pointer-events: none` on the
      // corner positioning div and only re-enables it (`pointer-events:
      // auto`) for descendants classed ".maplibregl-ctrl" -- since draw's
      // container never gets that class, its polygon/trash buttons render
      // (styled by mapbox-gl-draw.css) but silently eat no clicks. Tagging
      // the container with maplibre's class opts it back into that rule.
      map
        .getContainer()
        .querySelector(".mapboxgl-ctrl-group")
        ?.classList.add("maplibregl-ctrl");

      const emit = () => onPolygonChange(drawFeatureToPolygon(draw.getAll().features[0]));
      emitRef.current = emit;
      // mapbox-gl-draw fires these through the map's own Evented bus at
      // runtime, but maplibre-gl's .on() typing only knows its own built-in
      // event names -- widen just enough to register draw's custom ones.
      const on = map.on.bind(map) as (type: string, listener: () => void) => void;
      on("draw.create", emit);
      on("draw.update", emit);
      on("draw.delete", emit);
    },
    ({ map }) => {
      const emit = emitRef.current;
      if (!emit) return;
      const off = map.off.bind(map) as (type: string, listener: () => void) => void;
      off("draw.create", emit);
      off("draw.update", emit);
      off("draw.delete", emit);
    }
  );

  return null;
}

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
  const mapRef = useRef<MapRef | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  // Inlined at build time by Next.js, so this is available synchronously --
  // gating on it directly here (rather than via effect + setStatus) avoids
  // a render pass and reads no ref/impure value during render.
  const apiKey = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;

  if (!apiKey) {
    return (
      <p className="rounded-xl border border-border bg-card-alt px-4 py-3 text-sm text-muted">
        Boundary drawing requires <code>NEXT_PUBLIC_GEOAPIFY_API_KEY</code> to be configured (see{" "}
        <code>apps/web/.env.example</code>).
      </p>
    );
  }

  if (status === "error") {
    return (
      <p className="rounded-xl border border-border bg-card-alt px-4 py-3 text-sm text-muted">
        Couldn&apos;t load the map. Check your Geoapify API key and try again.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Map
        ref={mapRef}
        mapStyle={styleUrl(apiKey)}
        initialViewState={
          initialPolygon
            ? { bounds: polygonBounds(initialPolygon), fitBoundsOptions: { padding: 24 } }
            : { longitude: (initialCenter ?? DEFAULT_CENTER).lng, latitude: (initialCenter ?? DEFAULT_CENTER).lat, zoom: 15 }
        }
        style={{ height: "60vh", width: "100%", borderRadius: "0.75rem" }}
        onLoad={() => {
          setStatus("ready");
          collapseMapAttribution(mapRef.current?.getMap().getContainer());
        }}
        onError={() => setStatus("error")}
        attributionControl={{ compact: true }}
        // Survives React Strict Mode's dev-only double-mount -- see the same
        // reuseMaps comment in neighborhoods/[slug]/MapView.tsx.
        reuseMaps
      >
        <NavigationControl position="top-right" showCompass={false} />
        <DrawControl initialPolygon={initialPolygon} onPolygonChange={onPolygonChange} />
        {(previewCandidates ?? []).map((candidate) => (
          <Marker
            key={`${candidate.lat},${candidate.lng},${candidate.name}`}
            longitude={candidate.lng}
            latitude={candidate.lat}
          >
            <div
              title={candidate.name}
              className="h-2.5 w-2.5 rounded-full border border-white bg-brand-orange shadow"
            />
          </Marker>
        ))}
      </Map>
      <p className="text-xs font-bold text-muted">
        Use the polygon tool to click vertices into place (double-click or press Enter to finish). Drag a vertex to
        adjust the shape, or use the trash tool to delete and start over.
      </p>
    </div>
  );
}
