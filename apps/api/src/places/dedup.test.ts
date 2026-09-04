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

  it("is true at the exact same spot when one name is a prefix of the other", () => {
    // Live-verified: an OSM name simplification ("Kipos Greek" -> "Kipos")
    // drops nameSimilarity to ~0.45, under NAME_SIMILARITY_THRESHOLD, even
    // though the underlying place never moved.
    const renamed = { name: "Kipos Greek", location: { lat: 47.6772, lng: -122.3549 } };
    const other = { name: "Kipos", location: { lat: 47.6772, lng: -122.3549 } };
    expect(nameSimilarity(renamed.name, other.name)).toBeLessThan(0.6);
    expect(isDuplicate(renamed, other)).toBe(true);
  });

  it("is true for a same-building prefix match even with real-world coordinate noise", () => {
    // ~15m away -- a renamed node/way's tagged centroid commonly shifts a
    // bit along with the rename, not just the name; still well inside
    // DEDUP_RADIUS_METERS (30), which is the only radius the prefix check
    // uses now (see isPrefixOfOther's comment) -- an earlier, stricter
    // separate radius here missed exactly this real-world case live.
    const renamed = { name: "Kipos Greek", location: { lat: 47.6772, lng: -122.3549 } };
    const other = { name: "Kipos", location: { lat: 47.67733, lng: -122.3549 } };
    expect(isDuplicate(renamed, other)).toBe(true);
  });

  it("is false for a same-name-prefix candidate once it's outside DEDUP_RADIUS_METERS entirely", () => {
    // ~890m away -- a different "Kipos"-prefixed business across town isn't
    // the same place just because the name happens to be a prefix.
    const renamed = { name: "Kipos Greek", location: { lat: 47.6772, lng: -122.3549 } };
    const other = { name: "Kipos", location: { lat: 47.686, lng: -122.3549 } };
    expect(isDuplicate(renamed, other)).toBe(false);
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
