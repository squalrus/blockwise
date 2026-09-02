// @mapbox/mapbox-gl-draw ships no bundled types, and DefinitelyTyped's
// @types/mapbox__mapbox-gl-draw imports its Map/event types from "mapbox-gl"
// itself -- a package this project deliberately doesn't install, since the
// runtime target is MapLibre GL JS (BACKLOG.md Ref 114 Phase 6), not
// Mapbox's SDK. This is a minimal ambient shim covering only the API
// surface BoundaryMap.tsx actually calls, typed against maplibre-gl instead.
declare module "@mapbox/mapbox-gl-draw" {
  import type { IControl, Map as MaplibreMap } from "maplibre-gl";
  import type { Feature, FeatureCollection, Polygon } from "geojson";

  // Deliberately untyped as a maplibre-gl LayerSpecification -- these are
  // mapbox-gl-draw's own style layer objects (its bundled theme.js), not
  // authored by this codebase, and pulling in the style-spec type here
  // would need a dependency this shim otherwise avoids entirely.
  type DrawStyleLayer = Record<string, unknown>;

  interface MapboxDrawOptions {
    displayControlsDefault?: boolean;
    controls?: Record<string, boolean>;
    defaultMode?: string;
    styles?: DrawStyleLayer[];
  }

  export default class MapboxDraw implements IControl {
    constructor(options?: MapboxDrawOptions);
    onAdd(map: MaplibreMap): HTMLElement;
    onRemove(map: MaplibreMap): void;
    add(feature: Feature<Polygon> | Polygon): string[];
    get(id: string): Feature<Polygon> | undefined;
    getAll(): FeatureCollection<Polygon>;
    deleteAll(): this;
    delete(ids: string | string[]): this;
    changeMode(mode: string): this;
    getMode(): string;
    static lib: { theme: DrawStyleLayer[] };
  }
}
