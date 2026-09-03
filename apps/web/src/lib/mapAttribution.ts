// MapLibre's AttributionControl `compact: true` option only collapses the
// control when the user starts dragging the map -- on initial load it
// renders fully expanded (see maplibre-gl's AttributionControl source,
// `_updateCompact`/`_updateCompactMinimize`), and there's no library option
// for "start collapsed." This forces the same class removal the control's
// own drag handler applies, immediately after load instead of waiting for
// the first pan.
export function collapseMapAttribution(container: HTMLElement | undefined | null) {
  container
    ?.querySelector(".maplibregl-ctrl-attrib.maplibregl-compact-show")
    ?.classList.remove("maplibregl-compact-show");
}
