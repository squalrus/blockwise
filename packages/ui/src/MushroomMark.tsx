import { useId } from "react";
import type { MushroomShape, SpotShape } from "@blockwise/types";

// Shared four-part mushroom renderer (cap / spots / stalk / background) --
// the full generative mark from the Spored brand system, documented on the
// marketing site's /brand guidelines page. packages/ui's MushroomLogo is the
// simpler cap+stem+fixed-spots nav mark; this is the fuller version with
// configurable spot count/shape/colors, used both by the brand page's
// anatomy illustration and by per-user mushroom avatars (apps/web's
// mushroomConfigForUser). "button" -- the original mark -- keeps its own
// hardcoded path and hand-tuned per-count spot layout (SPOT_LAYOUTS below)
// unchanged; the other nine silhouettes (Spored Shape Study) live in
// SHAPE_GEOMETRY below with their own cap/stalk paths and spot positions.
const BUTTON_CAP_PATH = "M14 54 Q14 16 50 16 Q86 16 86 54 Z";

export type { SpotShape, MushroomShape };

// Cap/stalk path data for every silhouette but "button" (viewBox 0 0 100
// 100, matching BUTTON_CAP_PATH's own coordinate space) -- ported from the
// "Spored Shape Study" design exploration (spored-shapes.js). Each shape's
// `spots` are fixed [cx, cy, r] positions tailored to that cap's outline,
// sliced to spotCount (0-6) rather than button's per-count hand-tuned
// SPOT_LAYOUTS -- the study only hand-placed one set of up-to-six spots per
// silhouette, not a distinct layout for every count.
interface ShapeGeometry {
  capD: string;
  stalkD: string;
  spots: [number, number, number][];
}

const SHAPE_GEOMETRY: Record<Exclude<MushroomShape, "button">, ShapeGeometry> = {
  parasol: {
    capD: "M8 58 Q10 30 50 22 Q90 30 92 58 Z",
    stalkD: "M44 56 H56 V84 A6 6 0 0 1 44 84 Z M35 60 H65 V65 A4 4 0 0 1 61 69 H39 A4 4 0 0 1 35 65 Z",
    spots: [
      [28, 45, 5],
      [50, 35, 5],
      [72, 45, 5],
      [39, 52, 3.6],
      [61, 52, 3.6],
      [50, 51, 3.2],
    ],
  },
  bell: {
    capD: "M26 62 Q22 10 50 10 Q78 10 74 62 Z",
    stalkD: "M43 58 H57 V82 A7 7 0 0 1 43 82 Z",
    spots: [
      [38, 34, 5],
      [58, 26, 4.4],
      [60, 47, 4.6],
      [40, 52, 3.4],
      [50, 18, 3.4],
      [34, 46, 3.2],
    ],
  },
  chanterelle: {
    capD: "M10 46 Q12 18 50 18 Q88 18 90 46 Q68 32 50 36 Q32 32 10 46 Z",
    stalkD: "M42 34 H58 L55 82 A6 6 0 0 1 45 82 Z",
    // The three big spots sit at deliberately uneven heights/spacing rather
    // than mirrored across the center, so the rim doesn't read as a stamped
    // pattern; 4-6 layer in smaller, more randomly scattered spots.
    spots: [
      [26, 32, 4.8],
      [53, 24, 4.2],
      [71, 30, 4.8],
      [40, 24, 2.8],
      [61, 32, 2.6],
      [48, 30, 2.4],
    ],
  },
  morel: {
    capD: "M50 6 C72 6 80 26 80 44 C80 60 67 68 50 68 C33 68 20 60 20 44 C20 26 28 6 50 6 Z",
    stalkD: "M40 62 H60 V82 A10 10 0 0 1 40 82 Z",
    spots: [
      [34, 26, 4.4],
      [50, 19, 4.4],
      [66, 28, 4.4],
      [30, 44, 4.4],
      [50, 38, 4.4],
      [69, 46, 4.4],
    ],
  },
  enoki: {
    capD:
      "M22 44 Q22 31 32 31 Q42 31 42 44 Z M44 34 Q44 19 55 19 Q66 19 66 34 Z M65 53 Q65 42 74 42 Q83 42 83 53 Z",
    stalkD: "M28 42 H36 V84 A4 4 0 0 1 28 84 Z M51 32 H59 V84 A4 4 0 0 1 51 84 Z M70 51 H78 V84 A4 4 0 0 1 70 84 Z",
    // One big spot per tiny cap, each pushed off that cap's center rather
    // than pinned to its middle; 4-6 add a second, smaller off-center spot
    // to each cap.
    spots: [
      [29, 40, 3.2],
      [59, 24, 3],
      [69, 49, 2.8],
      [35, 41, 2],
      [61, 31, 2],
      [79, 46, 1.8],
    ],
  },
  porcini: {
    capD: "M10 48 Q10 18 50 18 Q90 18 90 48 Q70 58 50 57 Q30 58 10 48 Z",
    stalkD: "M36 46 C28 60 28 78 34 86 Q50 93 66 86 C72 78 72 60 64 46 Z",
    spots: [
      [30, 36, 5],
      [52, 28, 5],
      [70, 38, 5],
      [40, 47, 3.6],
      [62, 48, 3.6],
      [50, 44, 3.2],
    ],
  },
  oyster: {
    capD: "M18 72 Q8 40 40 24 Q76 12 88 42 Q94 66 52 74 Z",
    stalkD: "M22 66 L36 71 L30 86 A6 6 0 0 1 17 84 Z",
    spots: [
      [40, 40, 5],
      [62, 33, 4.6],
      [69, 55, 4.4],
      [28, 54, 4],
      [50, 58, 3.6],
      [78, 42, 3.4],
    ],
  },
  puffball: {
    capD: "M18 42 A32 32 0 1 1 82 42 A32 32 0 1 1 18 42 Z",
    stalkD: "M40 64 H60 V80 A10 10 0 0 1 40 80 Z",
    spots: [
      [36, 32, 5],
      [58, 25, 4.6],
      [64, 46, 5],
      [38, 52, 4],
      [50, 39, 3.6],
      [26, 44, 3.6],
    ],
  },
  shiitake: {
    capD: "M10 50 Q10 24 50 24 Q90 24 90 50 Q80 58 70 52 Q60 60 50 54 Q40 60 30 52 Q20 58 10 50 Z",
    stalkD: "M42 50 H58 V78 A8 8 0 0 1 42 78 Z",
    spots: [
      [30, 36, 5],
      [52, 31, 4.6],
      [70, 38, 4.6],
      [40, 45, 3.4],
      [61, 46, 3.4],
      [50, 42, 3],
    ],
  },
};

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

// Falls back to "button" (null -- its own hardcoded path/layout below) for
// anything not in SHAPE_GEOMETRY, not just an unrecognized string but also
// undefined/missing -- mushroom_customization rows saved before `shape`
// existed have no such field at all, and a stale client could still submit
// one from before a shape was added or removed here.
function geometryForShape(shape: MushroomShape): ShapeGeometry | null {
  return Object.prototype.hasOwnProperty.call(SHAPE_GEOMETRY, shape)
    ? SHAPE_GEOMETRY[shape as Exclude<MushroomShape, "button">]
    : null;
}

// "button"'s layout is its own hand-tuned-per-count table (SPOT_LAYOUTS);
// every other silhouette slices its fixed SHAPE_GEOMETRY.spots list (up to
// six) down to spotCount instead.
function spotLayout(
  shape: MushroomShape,
  spotCount: number
): { cx: number; cy: number; size: number }[] {
  const geometry = geometryForShape(shape);
  if (!geometry) {
    const count = Math.max(0, Math.min(SPOT_LAYOUTS.length, Math.round(spotCount)));
    return count === 0 ? [] : SPOT_LAYOUTS[count - 1];
  }
  const count = Math.max(0, Math.min(geometry.spots.length, Math.round(spotCount)));
  return geometry.spots.slice(0, count).map(([cx, cy, size]) => ({ cx, cy, size }));
}

// How many spots a silhouette actually has room to draw -- lets callers
// (the account customizer's spot-count picker) hide options that would
// silently render fewer spots than selected instead of the count asked for.
export function maxSpotCountForShape(shape: MushroomShape): number {
  return geometryForShape(shape)?.spots.length ?? SPOT_LAYOUTS.length;
}

// Cap/stalk/dot-position data for MushroomLogo's simpler two-tone mark
// (fixed 3 dots, no bg/spotCount/spotShape) -- lets it draw the same ten
// silhouettes as the full generative MushroomMark without duplicating
// SHAPE_GEOMETRY. null stalkD means "draw the plain rounded rect" (button's
// own stalk isn't a path) rather than a path string.
export interface MushroomOutline {
  capD: string;
  stalkD: string | null;
  dots: [number, number, number][];
}

export function mushroomOutline(shape: MushroomShape): MushroomOutline {
  const geometry = geometryForShape(shape);
  if (geometry) {
    return { capD: geometry.capD, stalkD: geometry.stalkD, dots: geometry.spots.slice(0, 3) };
  }
  return {
    capD: BUTTON_CAP_PATH,
    stalkD: null,
    dots: SPOT_LAYOUTS[2].map(({ cx, cy, size }): [number, number, number] => [cx, cy, size]),
  };
}

// One spot's shape at a given position/size/color -- factored out of
// spotElements below so a single spot can be drawn standalone (the account
// customizer's spot-shape swatches, which show one representative spot per
// shape rather than a full spotCount-many layout on a tiny mushroom).
export function spotShapeElement(spotShape: SpotShape, cx: number, cy: number, size: number, color: string) {
  switch (spotShape) {
    case "circle":
      return <circle cx={cx} cy={cy} r={size} fill={color} />;
    case "ring":
      return <circle cx={cx} cy={cy} r={size} fill="none" stroke={color} strokeWidth={size * 0.55} />;
    case "sparks": {
      const side = size * 1.7;
      return (
        <rect
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
      return <polygon points={polygonPoints(cx, cy, angles, radii)} fill={color} />;
    }
    case "triangle": {
      const r = size * 1.25;
      const angles = [0, 120, 240];
      return <polygon points={polygonPoints(cx, cy, angles, [r, r, r])} fill={color} />;
    }
    case "cross": {
      const armLength = size * 2.2;
      const armWidth = size * 0.75;
      return (
        <g>
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
}

function spotElements(layout: { cx: number; cy: number; size: number }[], spotShape: SpotShape, color: string) {
  if (layout.length === 0) return null;

  return layout.map(({ cx, cy, size }, i) => (
    <g key={i}>{spotShapeElement(spotShape, cx, cy, size, color)}</g>
  ));
}

export function MushroomMark({
  size = 96,
  shape = "button",
  cap = "#E8542A",
  stalk = "#FBF2E4",
  spots,
  spotCount = 3,
  spotShape = "circle",
  bg,
  outline = false,
}: {
  size?: number;
  shape?: MushroomShape;
  cap?: string;
  stalk?: string;
  spots?: string;
  spotCount?: number;
  spotShape?: SpotShape;
  bg?: string;
  // Test flag (BACKLOG.md Ref 98 collection-tile experiment): a thin
  // cap/stalk outline so a mushroom reads distinctly from a same-toned card
  // background. Off by default -- every other call site (avatars, mosaics,
  // checkin flip cards) is tuned for the current borderless look.
  outline?: boolean;
}) {
  const clipId = useId();
  const hasBg = Boolean(bg);
  const geometry = geometryForShape(shape);
  const capD = geometry ? geometry.capD : BUTTON_CAP_PATH;
  // A translucent ink stroke reads as a border against any cap/stalk color
  // (light or dark) without needing per-color contrast logic.
  const outlineProps = outline ? { stroke: "rgba(43, 27, 18, 0.35)", strokeWidth: 1.5 } : undefined;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: "block" }} aria-hidden="true">
      {hasBg && (
        // style (not the fill attribute) so a `var(--color)` reference --
        // e.g. an avatar's circular backdrop matching the current theme's
        // surface color -- resolves like ordinary CSS, not a literal string.
        <circle cx={50} cy={50} r={50} style={{ fill: bg }} />
      )}
      <g transform={hasBg ? "translate(50 52) scale(0.72) translate(-50 -50)" : undefined}>
        {geometry ? (
          <path d={geometry.stalkD} fill={stalk} {...outlineProps} />
        ) : (
          <rect x={40} y={52} width={20} height={34} rx={10} fill={stalk} {...outlineProps} />
        )}
        <path d={capD} fill={cap} {...outlineProps} />
        <g clipPath={`url(#${clipId})`}>{spotElements(spotLayout(shape, spotCount), spotShape, spots ?? stalk)}</g>
        <defs>
          <clipPath id={clipId}>
            <path d={capD} />
          </clipPath>
        </defs>
      </g>
    </svg>
  );
}
