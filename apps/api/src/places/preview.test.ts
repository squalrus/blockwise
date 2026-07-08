import { describe, expect, it } from "vitest";
import type { CategoryRecord } from "./categorize";
import type { GeoJsonPolygon } from "./geo";
import { MockPlacesClient } from "./mockClient";
import { previewNeighborhoodBoundary } from "./preview";

// Mirrors the boundary fixture in sync.test.ts closely enough to include
// every in-boundary fixture in mockClient.ts and exclude "Outside The
// Boundary Cafe".
const PHINNEYWOOD_BOUNDARY: GeoJsonPolygon = {
  type: "Polygon",
  coordinates: [
    [
      [-122.3605, 47.696],
      [-122.348, 47.696],
      [-122.346, 47.675],
      [-122.348, 47.658],
      [-122.356, 47.656],
      [-122.362, 47.665],
      [-122.362, 47.685],
      [-122.3605, 47.696],
    ],
  ],
};

const CATEGORIES: CategoryRecord[] = [
  { id: "coffee-shop", name: "Coffee Shop", source_mapping_json: { google: ["cafe", "coffee_shop"] } },
  { id: "bakery", name: "Bakery", source_mapping_json: { google: ["bakery"] } },
  { id: "park", name: "Park & Playground", source_mapping_json: { google: ["park", "playground"] } },
];

describe("previewNeighborhoodBoundary", () => {
  it("returns in-boundary candidates without touching persistence", async () => {
    const report = await previewNeighborhoodBoundary(
      PHINNEYWOOD_BOUNDARY,
      new MockPlacesClient(),
      CATEGORIES
    );

    expect(report.candidates.some((c) => c.name === "Diesel Fuel Coffee")).toBe(true);
    expect(report.candidates.some((c) => c.name === "Outside The Boundary Cafe")).toBe(false);
  });

  it("labels each candidate's category, leaving unmapped types uncategorized", async () => {
    const report = await previewNeighborhoodBoundary(
      PHINNEYWOOD_BOUNDARY,
      new MockPlacesClient(),
      CATEGORIES
    );

    const coffee = report.candidates.find((c) => c.name === "Diesel Fuel Coffee");
    expect(coffee?.categoryName).toBe("Coffee Shop");

    // "Widget Electronics Repair" has no matching category in CATEGORIES.
    const repairShop = report.candidates.find((c) => c.name === "Widget Electronics Repair");
    expect(repairShop?.categoryName).toBeNull();
  });

  it("reports tile/call counts alongside the candidates", async () => {
    const report = await previewNeighborhoodBoundary(
      PHINNEYWOOD_BOUNDARY,
      new MockPlacesClient(),
      CATEGORIES
    );

    expect(report.tilesQueried).toBeGreaterThan(0);
    expect(report.apiCallsMade).toBeGreaterThan(0);
  });
});
