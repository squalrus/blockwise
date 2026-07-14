import { useId } from "react";

// Shared four-part mushroom renderer (cap / spots / stalk / background) --
// the full generative mark from the Spored brand system, documented on the
// marketing site's /brand guidelines page. packages/ui's MushroomLogo is the
// simpler cap+stem+fixed-spots nav mark; this is the fuller version with
// configurable spot count/shape/colors, used both by the brand page's
// anatomy illustration and by per-user mushroom avatars (apps/web's
// mushroomConfigForUser).
const CAP_PATH = "M14 54 Q14 16 50 16 Q86 16 86 54 Z";

export type SpotShape = "circle" | "ring" | "sparks" | "star" | "triangle" | "cross";

export const SPOT_SHAPES: SpotShape[] = ["circle", "ring", "sparks", "star", "triangle", "cross"];

// Vertices for a regular polygon (or star) centered at (cx, cy) -- angles in
// degrees, 0 pointing straight up, matching how a viewer expects a triangle
// or star to sit upright rather than tipped over. radii lets star alternate
// between an outer and inner radius per vertex; a plain polygon (triangle)
// just repeats the same radius for every angle.
function polygonPoints(cx: number, cy: number, angles: number[], radii: number[]): string {
  return angles
    .map((angleDeg, i) => {
      const rad = ((angleDeg - 90) * Math.PI) / 180;
      const r = radii[i];
      return `${(cx + r * Math.cos(rad)).toFixed(2)},${(cy + r * Math.sin(rad)).toFixed(2)}`;
    })
    .join(" ");
}

// Spot count and spot shape are independent choices (any count pairs with
// any shape) -- previously these were fused into six named patterns (none/
// solo/classic/rings/sparks/halftone), each hardcoding both a count and a
// shape together. SPOT_LAYOUTS keeps each count's original hand-placed
// position/size variance (1 = the old "solo" spot, 2 = "rings", 3 =
// "classic", 6 = "halftone") rather than a mechanically uniform scatter --
// counts 4-5 (no prior named pattern to draw from) are new layouts in the
// same organic, center-out spirit.
const SPOT_LAYOUTS: { cx: number; cy: number; size: number }[][] = [
  // 1
  [{ cx: 50, cy: 34, size: 9 }],
  // 2
  [
    { cx: 37, cy: 33, size: 7 },
    { cx: 62, cy: 38, size: 5 },
  ],
  // 3
  [
    { cx: 34, cy: 35, size: 6 },
    { cx: 55, cy: 25, size: 4.5 },
    { cx: 65, cy: 40, size: 5.5 },
  ],
  // 4
  [
    { cx: 33, cy: 33, size: 5.4 },
    { cx: 53, cy: 24, size: 4.6 },
    { cx: 67, cy: 34, size: 5 },
    { cx: 46, cy: 44, size: 4.2 },
  ],
  // 5
  [
    { cx: 32, cy: 31, size: 4.8 },
    { cx: 50, cy: 22, size: 4 },
    { cx: 68, cy: 30, size: 4.4 },
    { cx: 40, cy: 43, size: 3.8 },
    { cx: 60, cy: 44, size: 4 },
  ],
  // 6
  [
    { cx: 30, cy: 39, size: 3.2 },
    { cx: 39, cy: 29, size: 3.2 },
    { cx: 51, cy: 23, size: 3.2 },
    { cx: 62, cy: 29, size: 3.2 },
    { cx: 69, cy: 41, size: 3.2 },
    { cx: 50, cy: 38, size: 3.2 },
  ],
];

function spotElements(spotCount: number, spotShape: SpotShape, color: string) {
  const count = Math.max(0, Math.min(SPOT_LAYOUTS.length, Math.round(spotCount)));
  if (count === 0) return null;

  return SPOT_LAYOUTS[count - 1].map(({ cx, cy, size }, i) => {
    switch (spotShape) {
      case "circle":
        return <circle key={i} cx={cx} cy={cy} r={size} fill={color} />;
      case "ring":
        return (
          <circle key={i} cx={cx} cy={cy} r={size} fill="none" stroke={color} strokeWidth={size * 0.55} />
        );
      case "sparks": {
        const side = size * 1.7;
        return (
          <rect
            key={i}
            x={cx - side / 2}
            y={cy - side / 2}
            width={side}
            height={side}
            rx={side * 0.18}
            transform={`rotate(45 ${cx} ${cy})`}
            fill={color}
          />
        );
      }
      case "star": {
        const outerR = size * 1.3;
        const innerR = size * 0.5;
        const angles = [0, 45, 90, 135, 180, 225, 270, 315];
        const radii = angles.map((_, idx) => (idx % 2 === 0 ? outerR : innerR));
        return <polygon key={i} points={polygonPoints(cx, cy, angles, radii)} fill={color} />;
      }
      case "triangle": {
        const r = size * 1.25;
        const angles = [0, 120, 240];
        return <polygon key={i} points={polygonPoints(cx, cy, angles, [r, r, r])} fill={color} />;
      }
      case "cross": {
        const armLength = size * 2.2;
        const armWidth = size * 0.75;
        return (
          <g key={i}>
            <rect
              x={cx - armLength / 2}
              y={cy - armWidth / 2}
              width={armLength}
              height={armWidth}
              rx={armWidth * 0.3}
              fill={color}
            />
            <rect
              x={cx - armWidth / 2}
              y={cy - armLength / 2}
              width={armWidth}
              height={armLength}
              rx={armWidth * 0.3}
              fill={color}
            />
          </g>
        );
      }
    }
  });
}

export function MushroomMark({
  size = 96,
  cap = "#E8542A",
  stalk = "#FBF2E4",
  spots,
  spotCount = 3,
  spotShape = "circle",
  bg,
}: {
  size?: number;
  cap?: string;
  stalk?: string;
  spots?: string;
  spotCount?: number;
  spotShape?: SpotShape;
  bg?: string;
}) {
  const clipId = useId();
  const hasBg = Boolean(bg);
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: "block" }} aria-hidden="true">
      {hasBg && (
        // style (not the fill attribute) so a `var(--color)` reference --
        // e.g. an avatar's circular backdrop matching the current theme's
        // surface color -- resolves like ordinary CSS, not a literal string.
        <circle cx={50} cy={50} r={50} style={{ fill: bg }} />
      )}
      <g transform={hasBg ? "translate(50 52) scale(0.72) translate(-50 -50)" : undefined}>
        <path d={CAP_PATH} fill={cap} />
        <rect x={40} y={52} width={20} height={34} rx={10} fill={stalk} />
        <g clipPath={`url(#${clipId})`}>{spotElements(spotCount, spotShape, spots ?? stalk)}</g>
        <defs>
          <clipPath id={clipId}>
            <path d={CAP_PATH} />
          </clipPath>
        </defs>
      </g>
    </svg>
  );
}
