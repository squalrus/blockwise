import { BRAND_AMBER, BRAND_GREEN, BRAND_INK, BRAND_ORANGE, BRAND_PURPLE } from "./colors";
import type { SporePattern } from "./MushroomMark";

// Deterministic PRNG (mulberry32) so a user's mushroom looks the same on
// every device/session without persisting cap/stalk/pattern choices in the
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

const CAPS = [BRAND_ORANGE, BRAND_AMBER, BRAND_GREEN, BRAND_PURPLE, BRAND_INK];
const CREAM_STALK = "#fbf2e4";
// "none" excluded -- every user's mushroom should read as a mushroom, not a
// blank cap that looks unfinished.
const PATTERNS: SporePattern[] = ["solo", "classic", "rings", "sparks", "halftone"];

export interface MushroomConfig {
  cap: string;
  stalk: string;
  pattern: SporePattern;
}

// One randomly-assigned mushroom "skin" per user, stable for that user's
// lifetime (BACKLOG.md: mushroom avatars). Spots always match the stalk
// color per brand guidelines, so callers should pass stalk as `spots` too.
export function mushroomConfigForUser(seed: string): MushroomConfig {
  const rnd = mulberry32(hashSeed(seed));
  const cap = CAPS[Math.floor(rnd() * CAPS.length)];
  // Mirrors the brand mosaic's rule: an ink-dark cap gets an amber stalk
  // (cream would be too low-contrast); otherwise mostly cream, sometimes ink.
  const stalk = cap === BRAND_INK ? BRAND_AMBER : rnd() < 0.25 ? BRAND_INK : CREAM_STALK;
  const pattern = PATTERNS[Math.floor(rnd() * PATTERNS.length)];
  return { cap, stalk, pattern };
}
