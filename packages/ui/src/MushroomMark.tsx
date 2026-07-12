import { useId } from "react";

// Shared four-part mushroom renderer (cap / spot pattern / stalk /
// background) -- the full generative mark from the Spored brand system,
// documented on apps/marketing's /brand guidelines page. packages/ui's
// MushroomLogo is the simpler cap+stem+"classic"-pattern nav mark; this is
// the fuller version with configurable pattern/colors, used both by the
// brand page's anatomy illustration and by per-user mushroom avatars
// (apps/web's mushroomConfigForUser).
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

export function MushroomMark({
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
        // style (not the fill attribute) so a `var(--color)` reference --
        // e.g. an avatar's circular backdrop matching the current theme's
        // surface color -- resolves like ordinary CSS, not a literal string.
        (bgShape === "square" ? (
          <rect x={0} y={0} width={100} height={100} rx={24} style={{ fill: bg }} />
        ) : (
          <circle cx={50} cy={50} r={50} style={{ fill: bg }} />
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
