import type { GeoJsonPolygon } from "@blockwise/types";

export type { GeoJsonPolygon };

const EARTH_RADIUS_METERS = 6_371_000;

export interface LatLng {
  lat: number;
  lng: number;
}

// Request-body validation for the admin boundary-drawing routes (BACKLOG.md
// Ref 8) -- catches a malformed shape before it reaches st_geomfromgeojson,
// which would otherwise surface as an opaque Postgres error instead of a
// clean 400. Requires a closed ring (first point === last point, GeoJSON's
// own requirement) of at least 4 positions (3 distinct vertices + the
// closing repeat) -- doesn't attempt to validate self-intersection.
export function isValidPolygon(value: unknown): value is GeoJsonPolygon {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as { type?: unknown; coordinates?: unknown };
  if (candidate.type !== "Polygon") return false;
  if (!Array.isArray(candidate.coordinates) || candidate.coordinates.length === 0) return false;

  const ring = candidate.coordinates[0];
  if (!Array.isArray(ring) || ring.length < 4) return false;

  const isPosition = (p: unknown): p is [number, number] =>
    Array.isArray(p) && p.length >= 2 && typeof p[0] === "number" && typeof p[1] === "number";
  if (!ring.every(isPosition)) return false;

  const [firstLng, firstLat] = ring[0] as [number, number];
  const [lastLng, lastLat] = ring[ring.length - 1] as [number, number];
  return firstLng === lastLng && firstLat === lastLat;
}

export function haversineMeters(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
}

// Ray-casting point-in-polygon test against the outer ring only -- our
// hand-authored and admin-drawn (§12.6) neighborhood boundaries aren't
// expected to have interior holes.
export function isPointInPolygon(point: LatLng, polygon: GeoJsonPolygon): boolean {
  const ring = polygon.coordinates[0];
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [lngI, latI] = ring[i];
    const [lngJ, latJ] = ring[j];

    const intersects =
      latI > point.lat !== latJ > point.lat &&
      point.lng < ((lngJ - lngI) * (point.lat - latI)) / (latJ - latI) + lngI;

    if (intersects) inside = !inside;
  }

  return inside;
}

const METERS_PER_DEGREE_LAT = 111_320;

export interface Circle {
  center: LatLng;
  radiusMeters: number;
}

// Splits a saturated search circle into a fixed 4-way fan-out of smaller,
// overlapping circles (sync.ts's sub-tiling retry, BACKLOG.md Ref 73) --
// deliberately NOT a full grid (generateCoverageGrid) over the circle's
// bounding box, which produces on the order of 10+ sub-tiles rather than 4
// and blew a real project's Google Places "SearchNearbyRequest per minute"
// quota the first time this was tried with an unbounded grid. A fixed
// branching factor keeps worst-case API cost per saturated tile bounded and
// predictable regardless of recursion depth (4^depth, not ~11^depth).
//
// Each sub-circle is centered at radiusMeters/2 from the original center
// along one of the 4 diagonals, with radiusMeters * 0.75 as its own radius.
// The minimum radius that still guarantees full coverage of the original
// circle with only 4 diagonally-placed sub-circles is radiusMeters/sqrt(2)
// (~0.707x, the distance from an axis-aligned boundary point to its nearest
// quadrant center) -- 0.75x leaves a small overlap margin above that
// theoretical minimum, mirroring generateCoverageGrid's own choice to space
// tiles below their gap-free maximum.
export function subdivideCircle(center: LatLng, radiusMeters: number): Circle[] {
  const offsetMeters = radiusMeters / 2;
  const subRadiusMeters = radiusMeters * 0.75;
  const metersPerDegreeLng = METERS_PER_DEGREE_LAT * Math.cos((center.lat * Math.PI) / 180);
  const latOffset = offsetMeters / METERS_PER_DEGREE_LAT;
  const lngOffset = offsetMeters / metersPerDegreeLng;

  return [
    { lat: center.lat + latOffset, lng: center.lng + lngOffset },
    { lat: center.lat + latOffset, lng: center.lng - lngOffset },
    { lat: center.lat - latOffset, lng: center.lng + lngOffset },
    { lat: center.lat - latOffset, lng: center.lng - lngOffset },
  ].map((subCenter) => ({ center: subCenter, radiusMeters: subRadiusMeters }));
}

function isNearPolygon(point: LatLng, polygon: GeoJsonPolygon, thresholdMeters: number): boolean {
  if (isPointInPolygon(point, polygon)) return true;

  return polygon.coordinates[0].some(
    ([lng, lat]) => haversineMeters(point, { lat, lng }) <= thresholdMeters
  );
}

// Google's Nearby Search (New Places API) restricts results to a circle, not
// an arbitrary polygon, and caps each call at 20 results -- a single circle
// covering all of Phinneywood hits that cap well before exhausting the
// area's real venues (confirmed in practice: a first sync attempt returned
// exactly 20 raw candidates). So the sync tiles the polygon's bounding box
// with a grid of smaller overlapping circles instead of one big one, each
// tile individually unlikely to exceed 20 results, then relies on
// isPointInPolygon downstream to trim tiles back to the real boundary.
//
// Spacing is kept below the theoretical gap-free maximum for a square grid
// of circles (radius * sqrt(2)) to leave overlap margin, at the cost of
// some duplicate results between adjacent tiles -- the sync dedupes those
// by place ID before processing.
export function generateCoverageGrid(polygon: GeoJsonPolygon, tileRadiusMeters: number): LatLng[] {
  const ring = polygon.coordinates[0];
  const lats = ring.map(([, lat]) => lat);
  const lngs = ring.map(([lng]) => lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const centerLatRad = (((minLat + maxLat) / 2) * Math.PI) / 180;
  const metersPerDegreeLng = METERS_PER_DEGREE_LAT * Math.cos(centerLatRad);

  const spacingMeters = tileRadiusMeters * 1.2;
  const latStep = spacingMeters / METERS_PER_DEGREE_LAT;
  const lngStep = spacingMeters / metersPerDegreeLng;

  const tiles: LatLng[] = [];
  for (let lat = minLat; lat <= maxLat + latStep; lat += latStep) {
    for (let lng = minLng; lng <= maxLng + lngStep; lng += lngStep) {
      const candidate = { lat, lng };
      if (isNearPolygon(candidate, polygon, tileRadiusMeters)) tiles.push(candidate);
    }
  }

  return tiles;
}
