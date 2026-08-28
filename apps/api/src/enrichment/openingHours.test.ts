import { describe, expect, it } from "vitest";
import { parseOsmOpeningHours } from "./openingHours";
import { isOpenNow, resolveOpenStatus } from "../locations/hours";

describe("parseOsmOpeningHours", () => {
  it("parses a simple weekday + weekend rule pair", () => {
    const lines = parseOsmOpeningHours("Mo-Fr 09:00-18:00; Sa 10:00-14:00");
    expect(lines).toContain("Monday: 9:00 AM – 6:00 PM");
    expect(lines).toContain("Friday: 9:00 AM – 6:00 PM");
    expect(lines).toContain("Saturday: 10:00 AM – 2:00 PM");
    expect(lines.some((l) => l.startsWith("Sunday"))).toBe(false);
  });

  it("parses off/closed days", () => {
    const lines = parseOsmOpeningHours("Mo-Sa 09:00-17:00; Su off");
    expect(lines).toContain("Sunday: Closed");
  });

  it("parses 24/7 as every day open 24 hours", () => {
    const lines = parseOsmOpeningHours("24/7");
    expect(lines).toHaveLength(7);
    expect(lines).toContain("Monday: Open 24 hours");
    expect(lines).toContain("Sunday: Open 24 hours");
  });

  it("lets a later rule override an earlier one for the same day", () => {
    const lines = parseOsmOpeningHours("Mo-Su 09:00-17:00; We 10:00-14:00");
    expect(lines).toContain("Wednesday: 10:00 AM – 2:00 PM");
    expect(lines).not.toContain("Wednesday: 9:00 AM – 5:00 PM");
  });

  it("skips a rule it doesn't understand rather than guessing", () => {
    // Multiple comma-separated time ranges (a lunch-break split) aren't
    // handled -- that day simply has no line, not a guessed/partial one.
    const lines = parseOsmOpeningHours("Mo 08:00-12:00,13:00-18:00");
    expect(lines.some((l) => l.startsWith("Monday"))).toBe(false);
  });

  it("returns an empty array for an unparseable string", () => {
    expect(parseOsmOpeningHours("by appointment only")).toEqual([]);
  });

  it("round-trips into locations/hours.ts's isOpenNow and resolveOpenStatus", () => {
    const lines = parseOsmOpeningHours("Mo-Fr 09:00-17:00");
    // 2026-07-06 is a Monday.
    expect(isOpenNow(lines, new Date("2026-07-06T14:00:00"))).toBe(true);
    expect(isOpenNow(lines, new Date("2026-07-06T20:00:00"))).toBe(false);
    expect(resolveOpenStatus(lines, new Date("2026-07-06T14:00:00"))).toEqual({ open: true, time: "5 PM" });
  });
});
