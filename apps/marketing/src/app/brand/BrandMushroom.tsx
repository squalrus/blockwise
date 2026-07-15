import { MushroomMark, SPOT_SHAPES } from "@blockwise/ui";
import type { SpotShape } from "@blockwise/ui";

// This page's anatomy/spot illustrations reuse packages/ui's MushroomMark
// (also used for per-user mushroom avatars) under the page's original name
// -- only the mosaic/PRNG below is page-specific.
const BrandMushroom = MushroomMark;
export { BrandMushroom, SPOT_SHAPES };
export type { SpotShape };

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

const MOSAIC_CAPS = ["#E8542A", "#F2A93B", "#4C8C4A", "#8B5FBF", "#2B1B12", "#4A5FA5", "#B33A3A", "#D98A9C"];
const MOSAIC_ACCENTS = ["#FBF2E4", "#2B1B12", "#F2D9A8", "#DCEBD3", "#C9B3E0", "#F5E8D3", "#C8D3BE", "#D8E3E8", "#E3C9AE"];
const MOSAIC_TINTS = ["#DCEBD3", "#F2D9A8", "#C9B3E0", "#F5E8D3", "#C8D3BE", "#D8E3E8", "#E3C9AE"];
const MOSAIC_MIN_SPOT_COUNT = 1;
const MOSAIC_MAX_SPOT_COUNT = 6;

export function BrandMosaic({ cols = 10, rows = 3, size = 44, seed = 7 }: { cols?: number; rows?: number; size?: number; seed?: number }) {
  const rnd = mulberry32(seed);
  const cells = Array.from({ length: cols * rows }, () => {
    const cap = MOSAIC_CAPS[Math.floor(rnd() * MOSAIC_CAPS.length)];
    // Mirrors mushroomConfigForUser's rule (packages/ui/mushroomConfig.ts):
    // an ink cap gets an amber accent, otherwise any of the base accents.
    const stalk = cap === "#2B1B12" ? "#F2A93B" : MOSAIC_ACCENTS[Math.floor(rnd() * MOSAIC_ACCENTS.length)];
    const spots = cap === "#2B1B12" ? "#F2A93B" : MOSAIC_ACCENTS[Math.floor(rnd() * MOSAIC_ACCENTS.length)];
    return {
      cap,
      stalk,
      spots,
      spotCount: MOSAIC_MIN_SPOT_COUNT + Math.floor(rnd() * (MOSAIC_MAX_SPOT_COUNT - MOSAIC_MIN_SPOT_COUNT + 1)),
      spotShape: SPOT_SHAPES[Math.floor(rnd() * SPOT_SHAPES.length)],
      bg: MOSAIC_TINTS[Math.floor(rnd() * MOSAIC_TINTS.length)],
    };
  });
  return (
    <div className="flex flex-wrap justify-center gap-2" style={{ maxWidth: cols * (size + 8) }}>
      {cells.map((c, i) => (
        <BrandMushroom
          key={i}
          size={size}
          cap={c.cap}
          stalk={c.stalk}
          spots={c.spots}
          spotCount={c.spotCount}
          spotShape={c.spotShape}
          bg={c.bg}
        />
      ))}
    </div>
  );
}
