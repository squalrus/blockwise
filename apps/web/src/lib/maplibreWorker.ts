import { setWorkerUrl } from "maplibre-gl";

// maplibre-gl resolves its worker script relative to its own bundled
// chunk's import.meta.url by default, which only works when the package is
// served unbundled -- under Turbopack/webpack the main module ends up in a
// differently-hashed chunk than that default derivation expects, so the
// worker 404s and is never created at all. Symptom: no console error, the
// map's "load" event just never fires and nothing beyond the base style's
// background layer ever paints, since every source (including a plain
// client-side GeoJSON one) depends on the worker pool for indexing/
// clustering.
//
// Pointing setWorkerUrl at a bundler-emitted asset URL (new URL(specifier,
// import.meta.url)) isn't enough either: the worker script itself imports a
// sibling "./maplibre-gl-shared.mjs" via a relative specifier, and asset
// emission doesn't preserve that relationship (the sibling never gets
// emitted next to the rehashed worker file). scripts/vendor-maplibre-worker.mjs
// (run via predev/prebuild) copies both files into public/ verbatim, so
// they're served byte-for-byte with their relative relationship intact and
// the worker's internal import resolves correctly.
setWorkerUrl("/maplibre-gl-worker.mjs");
