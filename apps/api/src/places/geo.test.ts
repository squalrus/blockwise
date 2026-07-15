import { describe, expect, it } from "vitest";
import {
  generateCoverageGrid,
  haversineMeters,
  isPointInPolygon,
  isValidPolygon,
  subdivideCircle,
  type GeoJsonPolygon,
} from "./geo";

describe("haversineMeters", () => {
  it("returns ~0 for the same point", () => {
    expect(haversineMeters({ lat: 47.68, lng: -122.35 }, { lat: 47.68, lng: -122.35 })).toBeCloseTo(
      0,
      6
    );
  });

  it("matches a known distance (Seattle to Portland, ~230km)", () => {
    const seattle = { lat: 47.6062, lng: -122.3321 };
    const portland = { lat: 45.5152, lng: -122.6784 };
    const distanceKm = haversineMeters(seattle, portland) / 1000;
    expect(distanceKm).toBeGreaterThan(225);
    expect(distanceKm).toBeLessThan(240);
  });
});

const SQUARE: GeoJsonPolygon = {
  type: "Polygon",
  coordinates: [
    [
      [-122.36, 47.66],
      [-122.34, 47.66],
      [-122.34, 47.68],
      [-122.36, 47.68],
      [-122.36, 47.66],
    ],
  ],
};

describe("isValidPolygon", () => {
  it("accepts a closed square ring", () => {
    expect(isValidPolygon(SQUARE)).toBe(true);
  });

  it("rejects a ring that isn't closed (first point !== last point)", () => {
    const open = { type: "Polygon", coordinates: [SQUARE.coordinates[0].slice(0, -1)] };
    expect(isValidPolygon(open)).toBe(false);
  });

  it("rejects fewer than 3 distinct vertices", () => {
    const tooFew = {
      type: "Polygon",
      coordinates: [[[-122.36, 47.66], [-122.34, 47.66], [-122.36, 47.66]]],
    };
    expect(isValidPolygon(tooFew)).toBe(false);
  });

  it("rejects a non-Polygon type", () => {
    expect(isValidPolygon({ type: "Point", coordinates: [-122.35, 47.67] })).toBe(false);
  });

  it("rejects null and non-object values", () => {
    expect(isValidPolygon(null)).toBe(false);
    expect(isValidPolygon("not a polygon")).toBe(false);
    expect(isValidPolygon(undefined)).toBe(false);
  });
});

describe("isPointInPolygon", () => {
  it("returns true for a point inside the ring", () => {
    expect(isPointInPolygon({ lat: 47.67, lng: -122.35 }, SQUARE)).toBe(true);
  });

  it("returns false for a point outside the ring", () => {
    expect(isPointInPolygon({ lat: 47.6, lng: -122.3 }, SQUARE)).toBe(false);
  });
});

describe("generateCoverageGrid", () => {
  it("produces at least one tile", () => {
    expect(generateCoverageGrid(SQUARE, 200).length).toBeGreaterThan(0);
  });

  it("every generated tile is within tileRadius of the polygon", () => {
    const tileRadiusMeters = 200;
    const tiles = generateCoverageGrid(SQUARE, tileRadiusMeters);

    for (const tile of tiles) {
      const nearEnough =
        isPointInPolygon(tile, SQUARE) ||
        SQUARE.coordinates[0].some(
          ([lng, lat]) => haversineMeters(tile, { lat, lng }) <= tileRadiusMeters
        );
      expect(nearEnough).toBe(true);
    }
  });

  it("every point on the polygon's boundary is covered by some tile's circle", () => {
    const tileRadiusMeters = 200;
    const tiles = generateCoverageGrid(SQUARE, tileRadiusMeters);
    const ring = SQUARE.coordinates[0];

    // Sample points along each edge, not just vertices, since a grid could
    // cover every corner while leaving a gap along an edge's midpoint.
    for (let i = 0; i < ring.length - 1; i++) {
      const [lngA, latA] = ring[i];
      const [lngB, latB] = ring[i + 1];

      for (const t of [0, 0.25, 0.5, 0.75, 1]) {
        const point = { lat: latA + (latB - latA) * t, lng: lngA + (lngB - lngA) * t };
        const covered = tiles.some((tile) => haversineMeters(tile, point) <= tileRadiusMeters);
        expect(covered).toBe(true);
      }
    }
  });

  it("uses a smaller tile radius to produce more tiles than a larger one", () => {
    const fewerTiles = generateCoverageGrid(SQUARE, 800).length;
    const moreTiles = generateCoverageGrid(SQUARE, 150).length;
    expect(moreTiles).toBeGreaterThan(fewerTiles);
  });
});

describe("subdivideCircle", () => {
  it("produces exactly 4 sub-circles, each smaller than the original", () => {
    const center = { lat: 47.68, lng: -122.35 };
    const subCircles = subdivideCircle(center, 400);

    expect(subCircles).toHaveLength(4);
    for (const sub of subCircles) {
      expect(sub.radiusMeters).toBeLessThan(400);
      expect(sub.radiusMeters).toBeGreaterThan(0);
    }
  });

  it("fans out in 4 distinct directions from the center", () => {
    const center = { lat: 47.68, lng: -122.35 };
    const subCircles = subdivideCircle(center, 400);

    const uniqueCenters = new Set(subCircles.map((s) => `${s.center.lat},${s.center.lng}`));
    expect(uniqueCenters.size).toBe(4);
    for (const sub of subCircles) {
      expect(haversineMeters(center, sub.center)).toBeGreaterThan(0);
    }
  });

  it("fully covers the original circle -- every boundary point falls within some sub-circle", () => {
    const center = { lat: 47.68, lng: -122.35 };
    const radiusMeters = 300;
    const subCircles = subdivideCircle(center, radiusMeters);

    for (const angleDeg of [0, 30, 45, 60, 90, 135, 180, 225, 270, 315]) {
      const angleRad = (angleDeg * Math.PI) / 180;
      const lat = center.lat + (Math.cos(angleRad) * radiusMeters) / 111_320;
      const metersPerDegreeLng = 111_320 * Math.cos((center.lat * Math.PI) / 180);
      const lng = center.lng + (Math.sin(angleRad) * radiusMeters) / metersPerDegreeLng;
      const point = { lat, lng };

      const covered = subCircles.some((sub) => haversineMeters(point, sub.center) <= sub.radiusMeters);
      expect(covered).toBe(true);
    }
  });
});
