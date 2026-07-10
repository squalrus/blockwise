import { useId } from "react";

// React port of the four-part generative mark from the Spored brand system
// (cap / spot pattern / stalk / background) -- used only on this page to
// illustrate the anatomy and spot-pattern library. The live app's mark
// (packages/ui's MushroomLogo) is intentionally simpler: cap + stem + the
// "classic" spot pattern, no background swatch.
const CAP_PATH = "M14 54 Q14 16 50 16 Q86 16 86 54 Z";

export type SporePattern = "none" | "solo" | "classic" | "rings" | "sparks" | "halftone";

export const SPOT_PATTERNS: SporePattern[] = ["none", "solo", "classic", "rings", "sparks", "halftone"];

function patternElements(pattern: SporePattern, color: string) {
  switch (pattern) {
    case "none":
      return null;
    case "solo":
      return <circle cx={50} cy={34} r={9} fill={color} />;
    case "classic":
      return (
        <>
          <circle cx={34} cy={35} r={6} fill={color} />
          <circle cx={55} cy={25} r={4.5} fill={color} />
          <circle cx={65} cy={40} r={5.5} fill={color} />
        </>
      );
    case "rings":
      return (
        <>
          <circle cx={37} cy={33} r={7} fill="none" stroke={color} strokeWidth={3.5} />
          <circle cx={62} cy={38} r={5} fill="none" stroke={color} strokeWidth={3} />
        </>
      );
    case "sparks":
      return (
        <>
          <rect x={30} y={29} width={11} height={11} rx={2} transform="rotate(45 35.5 34.5)" fill={color} />
          <rect x={55} y={21} width={8} height={8} rx={1.5} transform="rotate(45 59 25)" fill={color} />
          <rect x={60} y={37} width={9} height={9} rx={1.5} transform="rotate(45 64.5 41.5)" fill={color} />
        </>
      );
    case "halftone":
      return (
        [
          [30, 39],
          [39, 29],
          [51, 23],
          [62, 29],
          [69, 41],
          [50, 38],
        ] as const
      ).map(([cx, cy], i) => <circle key={i} cx={cx} cy={cy} r={3.2} fill={color} />);
  }
}

export function BrandMushroom({
  size = 96,
  cap = "#E8542A",
  stalk = "#FBF2E4",
  spots,
  pattern = "classic",
  bg,
  bgShape = "circle",
}: {
  size?: number;
  cap?: string;
  stalk?: string;
  spots?: string;
  pattern?: SporePattern;
  bg?: string;
  bgShape?: "circle" | "square";
}) {
  const clipId = useId();
  const hasBg = Boolean(bg);
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: "block" }} aria-hidden="true">
      {hasBg &&
        (bgShape === "square" ? (
          <rect x={0} y={0} width={100} height={100} rx={24} fill={bg} />
        ) : (
          <circle cx={50} cy={50} r={50} fill={bg} />
        ))}
      <g transform={hasBg ? "translate(50 52) scale(0.72) translate(-50 -50)" : undefined}>
        <path d={CAP_PATH} fill={cap} />
        <rect x={40} y={52} width={20} height={34} rx={10} fill={stalk} />
        <g clipPath={`url(#${clipId})`}>{patternElements(pattern, spots ?? stalk)}</g>
        <defs>
          <clipPath id={clipId}>
            <path d={CAP_PATH} />
          </clipPath>
        </defs>
      </g>
    </svg>
  );
}

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
