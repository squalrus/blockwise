import { describe, expect, it } from "vitest";
import { findDuplicate, isDuplicate, nameSimilarity } from "./dedup";

describe("nameSimilarity", () => {
  it("is 1 for identical names", () => {
    expect(nameSimilarity("Diesel Fuel Coffee", "Diesel Fuel Coffee")).toBe(1);
  });

  it("is high for a near-duplicate name", () => {
    expect(nameSimilarity("Diesel Fuel Coffee", "Diesel Fuel Coffee Shop")).toBeGreaterThan(0.6);
  });

  it("is low for unrelated names", () => {
    expect(nameSimilarity("Diesel Fuel Coffee", "Herkimer Coffee")).toBeLessThan(0.6);
  });

  it("ignores case and punctuation", () => {
    expect(nameSimilarity("Herkimer Coffee!", "herkimer coffee")).toBe(1);
  });
});

describe("isDuplicate", () => {
  const base = { name: "Diesel Fuel Coffee", location: { lat: 47.6772, lng: -122.3549 } };

  it("is true for a close, similarly-named candidate", () => {
    const other = { name: "Diesel Fuel Coffee Shop", location: { lat: 47.67722, lng: -122.35492 } };
    expect(isDuplicate(base, other)).toBe(true);
  });

  it("is false when far apart even with an identical name", () => {
    const other = { name: "Diesel Fuel Coffee", location: { lat: 47.6, lng: -122.3 } };
    expect(isDuplicate(base, other)).toBe(false);
  });

  it("is false when close but the name is unrelated", () => {
    const other = { name: "Herkimer Coffee", location: { lat: 47.6772, lng: -122.3549 } };
    expect(isDuplicate(base, other)).toBe(false);
  });
});

describe("findDuplicate", () => {
  it("finds the matching existing entry among several", () => {
    const candidate = { name: "Diesel Fuel Coffee Shop", location: { lat: 47.67722, lng: -122.35492 } };
    const existing = [
      { id: "1", name: "Herkimer Coffee", location: { lat: 47.6816, lng: -122.3552 } },
      { id: "2", name: "Diesel Fuel Coffee", location: { lat: 47.6772, lng: -122.3549 } },
    ];

    expect(findDuplicate(candidate, existing)?.id).toBe("2");
  });

  it("returns undefined when nothing matches", () => {
    const candidate = { name: "Brand New Venue", location: { lat: 47.7, lng: -122.4 } };
    const existing = [{ id: "1", name: "Herkimer Coffee", location: { lat: 47.6816, lng: -122.3552 } }];

    expect(findDuplicate(candidate, existing)).toBeUndefined();
  });
});
