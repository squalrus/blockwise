import { describe, expect, it } from "vitest";
import { isOpenNow, resolveOpenStatus } from "./hours";

const HOURS = [
  "Sunday: Closed",
  "Monday: 9:00 AM – 5:00 PM",
  "Tuesday: 9:00 AM – 5:00 PM",
  "Wednesday: 9:00 AM – 5:00 PM",
  "Thursday: 9:00 AM – 5:00 PM",
  "Friday: 9:00 AM – 5:00 PM",
  "Saturday: Open 24 hours",
];

describe("isOpenNow", () => {
  it("is open during today's window", () => {
    expect(isOpenNow(HOURS, new Date("2026-07-06T14:00:00"))).toBe(true); // Monday
  });

  it("is closed before today's window opens", () => {
    expect(isOpenNow(HOURS, new Date("2026-07-06T08:00:00"))).toBe(false); // Monday
  });

  it("is closed after today's window ends", () => {
    expect(isOpenNow(HOURS, new Date("2026-07-06T18:00:00"))).toBe(false); // Monday
  });

  it("treats a 'Closed' line as closed", () => {
    expect(isOpenNow(HOURS, new Date("2026-07-05T14:00:00"))).toBe(false); // Sunday
  });

  it("treats an 'Open 24 hours' line as always open", () => {
    expect(isOpenNow(HOURS, new Date("2026-07-04T02:00:00"))).toBe(true); // Saturday
  });

  it("handles an overnight range spanning midnight", () => {
    const overnight = ["Friday: 6:00 PM – 2:00 AM"];
    expect(isOpenNow(overnight, new Date("2026-07-10T23:00:00"))).toBe(true); // Friday 11pm
    expect(isOpenNow(overnight, new Date("2026-07-10T15:00:00"))).toBe(false); // Friday 3pm
  });

  it("returns false when there's no line for today", () => {
    expect(isOpenNow(["Monday: 9:00 AM – 5:00 PM"], new Date("2026-07-07T14:00:00"))).toBe(false); // Tuesday
  });

  it("returns false for an unparseable line", () => {
    expect(isOpenNow(["Monday: by appointment"], new Date("2026-07-06T14:00:00"))).toBe(false);
  });
});

describe("resolveOpenStatus", () => {
  it("returns the closing time, formatted, while open", () => {
    expect(resolveOpenStatus(HOURS, new Date("2026-07-06T14:00:00"))).toEqual({ open: true, time: "5 PM" }); // Monday
  });

  it("returns the opening time, formatted, before today's window opens", () => {
    expect(resolveOpenStatus(HOURS, new Date("2026-07-06T08:00:00"))).toEqual({ open: false, time: "9 AM" }); // Monday
  });

  it("returns the opening time, formatted, after today's window ends", () => {
    expect(resolveOpenStatus(HOURS, new Date("2026-07-06T18:00:00"))).toEqual({ open: false, time: "9 AM" }); // Monday
  });

  it("formats a time with minutes rather than dropping them", () => {
    const hours = ["Monday: 9:30 AM – 5:15 PM"];
    expect(resolveOpenStatus(hours, new Date("2026-07-06T14:00:00"))).toEqual({ open: true, time: "5:15 PM" });
  });

  it("treats a 'Closed' line as closed with no boundary time", () => {
    expect(resolveOpenStatus(HOURS, new Date("2026-07-05T14:00:00"))).toEqual({ open: false, time: null }); // Sunday
  });

  it("treats an 'Open 24 hours' line as open with no boundary time", () => {
    expect(resolveOpenStatus(HOURS, new Date("2026-07-04T02:00:00"))).toEqual({ open: true, time: null }); // Saturday
  });

  it("returns null when there's no line for today", () => {
    expect(resolveOpenStatus(["Monday: 9:00 AM – 5:00 PM"], new Date("2026-07-07T14:00:00"))).toBeNull(); // Tuesday
  });

  it("returns null for an unparseable line", () => {
    expect(resolveOpenStatus(["Monday: by appointment"], new Date("2026-07-06T14:00:00"))).toBeNull();
  });
});
