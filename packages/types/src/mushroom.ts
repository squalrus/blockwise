// Isomorphic mushroom-look logic -- pure functions/data, no DOM/React, so
// both @blockwise/ui (rendering) and apps/api (server-side snapshot capture,
// BACKLOG.md "Mushroom fingerprint stamps") can import the same source of
// truth instead of each maintaining its own copy of the palette/PRNG.

// Deterministic PRNG (mulberry32) so a user's mushroom looks the same on
// every device/session without persisting cap/stalk/spot choices in the
// database -- it's a pure function of a stable id (app_user.id, or username
// on the public profile where the internal id isn't exposed). Exported so
// callers needing their own reproducible-but-scattered layout (e.g.
// ProfileSummaryCard's growing-mushroom field) can derive more numbers from
// the same seed rather than reinventing a second PRNG.
export function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// djb2 -- any string (uuid, username) in, a well-distributed 32-bit int out.
export function hashSeed(input: string): number {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return hash >>> 0;
}

export type SpotShape = "circle" | "ring" | "sparks" | "star" | "triangle" | "cross";

export const SPOT_SHAPES: SpotShape[] = ["circle", "ring", "sparks", "star", "triangle", "cross"];

// Spored's brand accent palette (light-theme values) -- single source of
// truth for both the themed app (globals.css's --brand-* vars) and the
// marketing site (which uses fixed hex, no theming).
export const BRAND_ORANGE = "#e8542a";
export const BRAND_AMBER = "#f2a93b";
export const BRAND_GREEN = "#4c8c4a";
export const BRAND_PURPLE = "#8b5fbf";
export const BRAND_INK = "#2b1b12";
// Mushroom-generator cap additions (mushroomConfigForUser's CAPS below) --
// not (yet) general UI accent colors, so unlike the four above they have no
// globals.css --brand-* dark-mode variant.
export const BRAND_INDIGO = "#4a5fa5";
export const BRAND_RUSSULA = "#b33a3a";
export const BRAND_BLUSHER = "#d98a9c";

const CAPS = [BRAND_ORANGE, BRAND_AMBER, BRAND_GREEN, BRAND_PURPLE, BRAND_INK, BRAND_INDIGO, BRAND_RUSSULA, BRAND_BLUSHER];
const CREAM_STALK = "#fbf2e4";
// Background-tint colors (brand page's "04 Color" swatch table), also
// approved as stalk/spot accents -- not gated to a particular cap since
// they're all light-toned like Cream.
const WHEAT = "#f2d9a8";
const MEADOW = "#dcebd3";
const LILAC = "#c9b3e0";
const OAT = "#f5e8d3";
const SAGE = "#c8d3be";
const MIST = "#d8e3e8";
const CLAY = "#e3c9ae";
// Always available regardless of cap (unlike Amber, gated below).
const BASE_ACCENTS = [CREAM_STALK, BRAND_INK, WHEAT, MEADOW, LILAC, OAT, SAGE, MIST, CLAY];
// 0 excluded -- every user's mushroom should read as a mushroom, not a blank
// cap that looks unfinished.
const MIN_AUTO_SPOT_COUNT = 1;
const MAX_SPOT_COUNT = 6;

// Approved swatch values for the mushroom avatar customizer (BACKLOG.md Ref
// 75) -- exported so the customizer UI, apps/api's own validation
// (isValidMushroomCustomization), and MushroomMark's rendering all stay in
// sync with the values auto-assignment actually uses. Unlike auto-assignment,
// the customizer offers a spot count of 0 -- a user choosing a bare cap on
// purpose reads differently than one fabricated by chance (auto-assignment
// deliberately excludes it below).
//
// MUSHROOM_STALK_* also doubles as the approved palette for spot color --
// stalk and spots are independent choices (each picked separately below,
// not one mirroring the other), but they share the same palette and the
// same amber-only-with-cocoa-cap contrast rule.
export const MUSHROOM_CAPS = CAPS;
export const MUSHROOM_STALK_CREAM = CREAM_STALK;
export const MUSHROOM_STALK_COCOA = BRAND_INK;
export const MUSHROOM_STALK_WHEAT = WHEAT;
export const MUSHROOM_STALK_MEADOW = MEADOW;
export const MUSHROOM_STALK_LILAC = LILAC;
export const MUSHROOM_STALK_OAT = OAT;
export const MUSHROOM_STALK_SAGE = SAGE;
export const MUSHROOM_STALK_MIST = MIST;
export const MUSHROOM_STALK_CLAY = CLAY;
// Only ever paired with a Cocoa cap (contrast reasons, mirrored below in
// mushroomConfigForUser) -- the customizer must enforce that pairing itself.
export const MUSHROOM_STALK_AMBER = BRAND_AMBER;
// The always-available options (everything except Amber) -- customizer UI
// appends Amber itself only when the selected cap is Cocoa.
export const MUSHROOM_STALK_BASE_OPTIONS = BASE_ACCENTS;
// Every approved stalk/spots/bg value, Amber included -- for validators
// (apps/api's isValidMushroomCustomization) that need the full set rather
// than the "base options plus Amber if Cocoa" split the customizer UI uses.
export const MUSHROOM_STALKS = [...BASE_ACCENTS, MUSHROOM_STALK_AMBER];
export const MUSHROOM_SPOT_COUNTS = [0, 1, 2, 3, 4, 5, 6];
export const MUSHROOM_SPOT_SHAPES = SPOT_SHAPES;

export interface MushroomConfig {
  cap: string;
  stalk: string;
  spots: string;
  spotCount: number;
  spotShape: SpotShape;
  // Avatar rendering's backdrop circle (Avatar.tsx) -- not used by
  // MushroomField's decorative growing-field icons, which never render a
  // background at all.
  bg: string;
}

// One randomly-assigned mushroom "skin" per user, stable for that user's
// lifetime (BACKLOG.md: mushroom avatars). Stalk, spots, and background are
// each picked independently (separate rolls), not fused into one color.
export function mushroomConfigForUser(seed: string): MushroomConfig {
  const rnd = mulberry32(hashSeed(seed));
  const cap = CAPS[Math.floor(rnd() * CAPS.length)];
  // Mirrors the brand mosaic's rule: an ink-dark cap gets an amber accent
  // (cream would be too low-contrast); otherwise any of the base accents.
  const stalk = cap === BRAND_INK ? BRAND_AMBER : BASE_ACCENTS[Math.floor(rnd() * BASE_ACCENTS.length)];
  const spots = cap === BRAND_INK ? BRAND_AMBER : BASE_ACCENTS[Math.floor(rnd() * BASE_ACCENTS.length)];
  const bg = cap === BRAND_INK ? BRAND_AMBER : BASE_ACCENTS[Math.floor(rnd() * BASE_ACCENTS.length)];
  const spotCount = MIN_AUTO_SPOT_COUNT + Math.floor(rnd() * (MAX_SPOT_COUNT - MIN_AUTO_SPOT_COUNT + 1));
  const spotShape = SPOT_SHAPES[Math.floor(rnd() * SPOT_SHAPES.length)];
  return { cap, stalk, spots, spotCount, spotShape, bg };
}

// Prefers a user's saved customizer choice (BACKLOG.md Ref 75) over the
// hash-derived default, so render call sites don't each need to branch on
// null themselves.
export function resolveMushroomConfig(seed: string, customization: MushroomConfig | null): MushroomConfig {
  return customization ?? mushroomConfigForUser(seed);
}

// BACKLOG.md "Mushroom fingerprint stamps on connections and check-ins":
// a user's look can change after the fact (customizer edit, or an
// auto-assigned look shifting after a palette/shape change) -- a snapshot
// freezes what it looked like *at the moment* of a check-in or accepted
// connection, so history doesn't silently repaint. `v` is an algorithm-
// version tag (bump whenever the shape of MushroomConfig or the
// palette/PRNG changes) so old snapshots are never misread as the current
// algorithm's output -- bumped to 2 here since the shipped customizer split
// the old fused "pattern" into independent spotCount/spotShape and added
// independent spots/bg colors.
export const MUSHROOM_SNAPSHOT_VERSION = 2;

export interface MushroomSnapshot extends MushroomConfig {
  v: number;
}

export function snapshotMushroomForUser(seed: string, customization: MushroomConfig | null): MushroomSnapshot {
  return { v: MUSHROOM_SNAPSHOT_VERSION, ...resolveMushroomConfig(seed, customization) };
}
