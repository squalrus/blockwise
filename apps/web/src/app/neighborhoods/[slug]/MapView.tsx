"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MapGL, {
  Source,
  Layer,
  Popup,
  NavigationControl,
  type MapRef,
  type MapLayerMouseEvent,
} from "react-map-gl/maplibre";
import type { GeoJSONSource } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "@/lib/maplibreWorker";
import { collapseMapAttribution } from "@/lib/mapAttribution";
import type { VenueListItem } from "@blockwise/types";
import { getCategoryColor, getCategoryLegend, type ColorMode } from "@/lib/categoryColors";
import { getResolvedTheme, subscribeToThemeChanges } from "@/lib/theme";

const DEFAULT_CENTER = { lat: 47.6869, lng: -122.3554 }; // Phinneywood, Seattle

// Geoapify-hosted style JSON (BACKLOG.md Ref 114 Phase 6) -- a full MapLibre
// style spec pointing at Geoapify's vector tiles, not a raster basemap, so
// light/dark just swaps which CARTO-inspired named style loads rather than
// re-theming anything client-side.
const GEOAPIFY_BASEMAP_STYLE: Record<ColorMode, string> = {
  light: "positron",
  dark: "dark-matter",
};

function styleUrl(mode: ColorMode, apiKey: string): string {
  return `https://maps.geoapify.com/v1/styles/${GEOAPIFY_BASEMAP_STYLE[mode]}/style.json?apiKey=${apiKey}`;
}

const CLUSTER_COLOR: Record<ColorMode, string> = {
  light: "#8b5fbf",
  dark: "#b98af2",
};

function useColorMode(): ColorMode {
  const [mode, setMode] = useState<ColorMode>(() => getResolvedTheme());

  useEffect(() => subscribeToThemeChanges(setMode), []);

  return mode;
}

type VenueFeatureCollection = GeoJSON.FeatureCollection<
  GeoJSON.Point,
  { id: string; name: string; category_name: string | null; address: string; color: string }
>;

function buildFeatureCollection(venues: VenueListItem[], mode: ColorMode): VenueFeatureCollection {
  return {
    type: "FeatureCollection",
    features: venues.map((venue) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [venue.lng, venue.lat] },
      properties: {
        id: venue.id,
        name: venue.name,
        category_name: venue.category_name,
        address: venue.address,
        color: getCategoryColor(venue.category_group, mode),
      },
    })),
  };
}

function computeBounds(venues: VenueListItem[]): [[number, number], [number, number]] | null {
  if (venues.length === 0) return null;
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  for (const venue of venues) {
    minLng = Math.min(minLng, venue.lng);
    minLat = Math.min(minLat, venue.lat);
    maxLng = Math.max(maxLng, venue.lng);
    maxLat = Math.max(maxLat, venue.lat);
  }
  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}

export function MapView({ venues }: { venues: VenueListItem[] }) {
  const mapRef = useRef<MapRef | null>(null);
  const [popup, setPopup] = useState<{ longitude: number; latitude: number; venue: VenueListItem } | null>(null);
  const mode = useColorMode();
  // Inlined at build time by Next.js, so this is available synchronously --
  // gating on it directly here (rather than via effect + setStatus) avoids
  // a render pass and reads no ref/impure value during render.
  const apiKey = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;

  const featureCollection = useMemo(() => buildFeatureCollection(venues, mode), [venues, mode]);
  const bounds = useMemo(() => computeBounds(venues), [venues]);
  const venueById = useMemo(() => new Map(venues.map((v) => [v.id, v])), [venues]);

  const handleClick = useCallback(
    (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      const map = mapRef.current?.getMap();
      if (!feature || !map || feature.geometry.type !== "Point") return;
      const [lng, lat] = feature.geometry.coordinates as [number, number];

      if (feature.layer?.id === "venue-clusters") {
        const clusterId = feature.properties?.cluster_id;
        const source = map.getSource("venues") as GeoJSONSource;
        source
          .getClusterExpansionZoom(clusterId)
          .then((zoom) => map.easeTo({ center: [lng, lat], zoom }))
          .catch(() => {});
        return;
      }

      if (feature.layer?.id === "venue-points") {
        const venue = venueById.get(feature.properties?.id);
        if (venue) setPopup({ longitude: lng, latitude: lat, venue });
      }
    },
    [venueById]
  );

  if (!apiKey) {
    return (
      <p className="rounded-xl border border-border bg-card-alt px-4 py-3 text-sm text-muted">
        Map view requires <code>NEXT_PUBLIC_GEOAPIFY_API_KEY</code> to be configured (see{" "}
        <code>apps/web/.env.example</code>).
      </p>
    );
  }

  return (
    <div className="relative">
      <MapGL
        ref={mapRef}
        mapStyle={styleUrl(mode, apiKey)}
        initialViewState={
          bounds
            ? { bounds, fitBoundsOptions: { padding: 40 } }
            : { longitude: DEFAULT_CENTER.lng, latitude: DEFAULT_CENTER.lat, zoom: 14 }
        }
        style={{ height: "70vh", width: "100%", borderRadius: "0.75rem" }}
        interactiveLayerIds={["venue-clusters", "venue-points"]}
        onClick={handleClick}
        cursor="pointer"
        attributionControl={{ compact: true }}
        onLoad={() => collapseMapAttribution(mapRef.current?.getMap().getContainer())}
        // Survives React Strict Mode's dev-only double-mount: without this,
        // the phantom first unmount permanently destroys the WebGL context
        // (maplibre-gl's Map.remove()), leaving the real second mount with a
        // dead canvas that never renders anything (no console error either --
        // it just silently never requests a single map tile). reuseMaps
        // recycles the context on that phantom unmount instead.
        reuseMaps
      >
        <NavigationControl position="top-right" showCompass={false} />
        <Source
          id="venues"
          type="geojson"
          data={featureCollection}
          cluster={true}
          clusterMaxZoom={14}
          clusterRadius={50}
        >
          <Layer
            id="venue-clusters"
            type="circle"
            filter={["has", "point_count"]}
            paint={{
              "circle-color": CLUSTER_COLOR[mode],
              "circle-radius": ["step", ["get", "point_count"], 16, 10, 20, 25, 26],
              "circle-stroke-width": 2,
              "circle-stroke-color": "#ffffff",
            }}
          />
          <Layer
            id="venue-cluster-count"
            type="symbol"
            filter={["has", "point_count"]}
            layout={{
              "text-field": ["get", "point_count_abbreviated"],
              "text-size": 12,
              "text-font": ["Noto Sans Bold"],
            }}
            paint={{ "text-color": "#ffffff" }}
          />
          <Layer
            id="venue-points"
            type="circle"
            filter={["!", ["has", "point_count"]]}
            paint={{
              "circle-color": ["get", "color"],
              "circle-radius": 8,
              "circle-stroke-width": 2,
              "circle-stroke-color": "#ffffff",
            }}
          />
        </Source>
        {popup && (
          <Popup
            longitude={popup.longitude}
            latitude={popup.latitude}
            onClose={() => setPopup(null)}
            closeOnClick={false}
            anchor="bottom"
          >
            <div className="flex flex-col gap-1 text-sm">
              <div className="font-extrabold text-foreground">{popup.venue.name}</div>
              <div className="text-muted">
                {[popup.venue.category_name, popup.venue.address].filter(Boolean).join(" · ")}
              </div>
              <a
                href={`/location/${popup.venue.id}`}
                className="mt-1 font-bold text-brand-purple hover:text-brand-orange"
              >
                View details
              </a>
            </div>
          </Popup>
        )}
      </MapGL>
      <div className="absolute bottom-4 left-4 flex flex-col gap-1 rounded-xl border border-border bg-card/95 px-3 py-2 text-xs shadow-sm">
        {getCategoryLegend(mode).map((entry) => (
          <div key={entry.name} className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="font-bold text-foreground">{entry.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
