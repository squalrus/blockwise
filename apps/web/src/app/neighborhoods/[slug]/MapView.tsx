"use client";

import { useEffect, useRef, useState } from "react";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import type { VenueListItem } from "@blockwise/types";
import { getCategoryColor, getCategoryLegend, type ColorMode } from "@/lib/categoryColors";
import { getResolvedTheme, subscribeToThemeChanges } from "@/lib/theme";

const DEFAULT_CENTER = { lat: 47.6869, lng: -122.3554 }; // Phinneywood, Seattle

// setOptions() must run exactly once before the first importLibrary() call
// (a second call just logs a dev warning, but there's no reason to repeat
// it) -- guard it at module scope since this effect re-runs on color-mode
// change to recolor markers, not just on mount.
let mapsOptionsSet = false;
function ensureMapsOptionsSet(apiKey: string) {
  if (mapsOptionsSet) return;
  setOptions({ key: apiKey, v: "weekly" });
  mapsOptionsSet = true;
}

function useColorMode(): ColorMode {
  const [mode, setMode] = useState<ColorMode>(() => getResolvedTheme());

  useEffect(() => subscribeToThemeChanges(setMode), []);

  return mode;
}

// Built with DOM APIs (textContent, not innerHTML) rather than an HTML
// string, since venue name/address ultimately come from Google Places sync
// and, later, direct business self-submission (README §1.2) -- neither
// should be trusted as pre-sanitized HTML.
function buildInfoWindowContent(venue: VenueListItem): HTMLElement {
  const container = document.createElement("div");
  container.className = "flex flex-col gap-1 text-sm";

  const name = document.createElement("div");
  name.className = "font-extrabold text-foreground";
  name.textContent = venue.name;
  container.appendChild(name);

  const meta = document.createElement("div");
  meta.className = "text-muted";
  meta.textContent = [venue.category_name, venue.address].filter(Boolean).join(" · ");
  container.appendChild(meta);

  const link = document.createElement("a");
  link.href = `/venues/${venue.id}`;
  link.textContent = "View details";
  link.className = "mt-1 font-bold text-brand-purple hover:text-brand-orange";
  container.appendChild(link);

  return container;
}

export function MapView({ venues }: { venues: VenueListItem[] }) {
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "no-key" | "error">("loading");
  const mode = useColorMode();

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setStatus("no-key");
      return;
    }
    if (!mapDivRef.current) return;

    let clusterer: MarkerClusterer | undefined;
    let cancelled = false;

    ensureMapsOptionsSet(apiKey);
    Promise.all([
      importLibrary("maps"),
      importLibrary("marker"),
      importLibrary("core"),
    ])
      .then(([{ Map, InfoWindow }, { Marker }, { LatLngBounds, SymbolPath }]) => {
        if (cancelled || !mapDivRef.current) return;

        const map = new Map(mapDivRef.current, {
          center: DEFAULT_CENTER,
          zoom: 14,
        });

        const bounds = new LatLngBounds();
        const markers = venues.map((venue) => {
          const position = { lat: venue.lat, lng: venue.lng };
          bounds.extend(position);

          const marker = new Marker({
            position,
            icon: {
              path: SymbolPath.CIRCLE,
              scale: 8,
              fillColor: getCategoryColor(venue.category_group, mode),
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 2,
            },
          });

          const infoWindow = new InfoWindow({
            content: buildInfoWindowContent(venue),
          });
          marker.addListener("click", () => infoWindow.open({ map, anchor: marker }));

          return marker;
        });

        if (venues.length > 0) map.fitBounds(bounds);

        // Groups markers into a cluster pin once venue density makes
        // individual pins overlap at a given zoom level (README §1.7).
        clusterer = new MarkerClusterer({ map, markers });

        setStatus("ready");
      })
      .catch((err) => {
        console.error("Failed to load Google Maps:", err);
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
      clusterer?.clearMarkers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-init only when the venue set or color mode actually changes
  }, [venues, mode]);

  if (status === "no-key") {
    return (
      <p className="rounded-xl border border-border bg-card-alt px-4 py-3 text-sm text-muted">
        Map view requires <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to be configured (see{" "}
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
    <div className="relative">
      <div ref={mapDivRef} className="h-[70vh] w-full rounded-xl border border-border" />
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
