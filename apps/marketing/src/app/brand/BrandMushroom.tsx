import { MushroomMark, SPOT_PATTERNS } from "@blockwise/ui";
import type { SporePattern } from "@blockwise/ui";

// This page's anatomy/spot-pattern illustrations reuse packages/ui's
// MushroomMark (also used for per-user mushroom avatars) under the
// page's original name -- only the mosaic/PRNG below is page-specific.
const BrandMushroom = MushroomMark;
export { BrandMushroom, SPOT_PATTERNS };
export type { SporePattern };

// Deterministic PRNG so the mosaic renders identically on every request
// (this is a static marketing page -- no client-side randomness).
function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MOSAIC_CAPS = ["#E8542A", "#F2A93B", "#4C8C4A", "#8B5FBF", "#2B1B12"];
const MOSAIC_TINTS = ["#DCEBD3", "#F2D9A8", "#C9B3E0", "#F5E8D3"];
const MOSAIC_PATTERNS: SporePattern[] = ["solo", "classic", "rings", "sparks", "halftone"];

export function BrandMosaic({ cols = 10, rows = 3, size = 44, seed = 7 }: { cols?: number; rows?: number; size?: number; seed?: number }) {
  const rnd = mulberry32(seed);
  const cells = Array.from({ length: cols * rows }, () => {
    const cap = MOSAIC_CAPS[Math.floor(rnd() * MOSAIC_CAPS.length)];
    const stalk = cap === "#2B1B12" ? "#F2A93B" : rnd() < 0.25 ? "#2B1B12" : "#FBF2E4";
    return {
      cap,
      stalk,
      pattern: MOSAIC_PATTERNS[Math.floor(rnd() * MOSAIC_PATTERNS.length)],
      bg: MOSAIC_TINTS[Math.floor(rnd() * MOSAIC_TINTS.length)],
      bgShape: (rnd() < 0.5 ? "circle" : "square") as "circle" | "square",
    };
  });
  return (
    <div className="flex flex-wrap justify-center gap-2" style={{ maxWidth: cols * (size + 8) }}>
      {cells.map((c, i) => (
        <BrandMushroom key={i} size={size} cap={c.cap} stalk={c.stalk} spots={c.stalk} pattern={c.pattern} bg={c.bg} bgShape={c.bgShape} />
      ))}
    </div>
  );
}
