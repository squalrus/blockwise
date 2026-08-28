import { describe, expect, it } from "vitest";
import { buildGeoapifyCategoryIndex, matchCategory, type CategoryRecord } from "./categorize";

const CATEGORIES: CategoryRecord[] = [
  { id: "food-drink", name: "Food & Drink", source_mapping_json: {} },
  {
    id: "coffee-shop",
    name: "Coffee Shop",
    source_mapping_json: { geoapify: ["catering.cafe.coffee_shop", "catering.cafe.coffee"] },
  },
  { id: "bakery", name: "Bakery", source_mapping_json: { geoapify: ["commercial.food_and_drink.bakery"] } },
  { id: "restaurant", name: "Restaurant", source_mapping_json: { geoapify: ["catering.restaurant"] } },
];

describe("buildGeoapifyCategoryIndex", () => {
  it("indexes every geoapify tag for each category", () => {
    const index = buildGeoapifyCategoryIndex(CATEGORIES);
    expect(index.map((e) => e.tag)).toEqual(
      expect.arrayContaining(["catering.cafe.coffee_shop", "catering.cafe.coffee", "commercial.food_and_drink.bakery", "catering.restaurant"])
    );
  });

  it("skips categories with no geoapify mapping (parent/organizational rows)", () => {
    const index = buildGeoapifyCategoryIndex(CATEGORIES);
    expect(index).toHaveLength(4);
  });
});

describe("matchCategory", () => {
  const index = buildGeoapifyCategoryIndex(CATEGORIES);

  it("matches an exact tag", () => {
    const match = matchCategory({ categories: ["commercial.food_and_drink.bakery"] }, index);
    expect(match?.id).toBe("bakery");
  });

  it("matches a more specific place tag against a broader configured prefix", () => {
    const match = matchCategory({ categories: ["catering.restaurant.italian"] }, index);
    expect(match?.id).toBe("restaurant");
  });

  it("does not treat unrelated tags sharing a prefix word as a match", () => {
    // "catering.restaurantesque" is not "catering.restaurant" or a child of
    // it -- the dot-boundary check must reject this, not just startsWith.
    const match = matchCategory({ categories: ["catering.restaurantesque"] }, index);
    expect(match).toBeUndefined();
  });

  it("falls through the place's category list in order", () => {
    const match = matchCategory({ categories: ["leisure.park", "catering.cafe.coffee"] }, index);
    expect(match?.id).toBe("coffee-shop");
  });

  it("returns undefined for an unmapped tag rather than guessing", () => {
    const match = matchCategory({ categories: ["service.electronics_repair"] }, index);
    expect(match).toBeUndefined();
  });
});
