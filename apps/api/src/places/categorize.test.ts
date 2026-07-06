import { describe, expect, it } from "vitest";
import { buildGoogleTypeIndex, matchCategory, type CategoryRecord } from "./categorize";

const CATEGORIES: CategoryRecord[] = [
  { id: "food-drink", name: "Food & Drink", source_mapping_json: {} },
  {
    id: "coffee-shop",
    name: "Coffee Shop",
    source_mapping_json: { google: ["cafe", "coffee_shop"] },
  },
  { id: "bakery", name: "Bakery", source_mapping_json: { google: ["bakery"] } },
];

describe("buildGoogleTypeIndex", () => {
  it("indexes every google type string for each category", () => {
    const index = buildGoogleTypeIndex(CATEGORIES);
    expect(index.get("cafe")?.id).toBe("coffee-shop");
    expect(index.get("coffee_shop")?.id).toBe("coffee-shop");
    expect(index.get("bakery")?.id).toBe("bakery");
  });

  it("skips categories with no google mapping (parent/organizational rows)", () => {
    const index = buildGoogleTypeIndex(CATEGORIES);
    expect(index.size).toBe(3);
  });
});

describe("matchCategory", () => {
  const index = buildGoogleTypeIndex(CATEGORIES);

  it("matches on primaryType first", () => {
    const match = matchCategory({ primaryType: "bakery", types: ["food", "bakery"] }, index);
    expect(match?.id).toBe("bakery");
  });

  it("falls through to types[] when primaryType doesn't match", () => {
    const match = matchCategory({ primaryType: "food", types: ["food", "cafe"] }, index);
    expect(match?.id).toBe("coffee-shop");
  });

  it("returns undefined for an unmapped type rather than guessing", () => {
    const match = matchCategory({ types: ["electronics_repair"] }, index);
    expect(match).toBeUndefined();
  });
});
