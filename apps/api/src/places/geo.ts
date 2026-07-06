const EARTH_RADIUS_METERS = 6_371_000;

export interface LatLng {
  lat: number;
  lng: number;
}

export interface GeoJsonPolygon {
  type: "Polygon";
  coordinates: number[][][];
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
