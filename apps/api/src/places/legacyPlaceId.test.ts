import { describe, expect, it } from "vitest";
import { isLegacyGooglePlaceId } from "./legacyPlaceId";

describe("isLegacyGooglePlaceId", () => {
  it("flags a Google-shaped place id", () => {
    expect(isLegacyGooglePlaceId("ChIJN1t_tDeuEmsRUsoyG83frY4")).toBe(true);
  });

  it("does not flag a Geoapify-shaped place id", () => {
    expect(isLegacyGooglePlaceId("geoapify-mock-herkimer-coffee")).toBe(false);
    expect(isLegacyGooglePlaceId("51a51e0a2c8b4b5abf59...")).toBe(false);
  });
});
