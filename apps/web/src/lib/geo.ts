const EARTH_RADIUS_METERS = 6_371_000;

export interface LatLng {
  lat: number;
  lng: number;
}

// Mirrors apps/api/src/places/geo.ts's server-side formula -- duplicated
// rather than shared across the web/api boundary since the two apps don't
// share a non-type internal package today (packages/types is types-only).
export function haversineMeters(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
}

export function sortByDistance<T extends LatLng>(items: T[], from: LatLng): T[] {
  return [...items].sort((a, b) => haversineMeters(from, a) - haversineMeters(from, b));
}
