import type { MushroomShape } from "@blockwise/types";
import { mushroomOutline } from "./MushroomMark";

// Spored's mushroom mark: a rounded cap (with the brand's "classic" spot
// pattern) over a short stem -- the four-part anatomy documented on the
// /brand guidelines page, minus the background swatch. Reused as the nav
// logo, map/list pins, and the slide-to-check-in thumb icon. `shape`
// defaults to "button" -- the original, single fixed mark every existing
// caller (nav, footer, admin layouts) keeps rendering unchanged -- but
// PlaceListItem's venue/POI pins pass a per-id silhouette (Spored Shape
// Study) via mushroomOutline, the same geometry MushroomMark's full
// generative avatars draw from.
//
// capColor should normally be a `var(--brand-*)` reference (not a raw hex) so
// the cap re-colors and glows automatically when the dark theme's brighter
// accent palette kicks in (see .icon-glow in globals.css) -- a literal hex
// would freeze the icon to one theme's shade. stemClassName and dotClassName
// are Tailwind text-color utilities (each a stand-in for the mushroom
// avatar system's independent stalk/spots colors, @blockwise/types'
// mushroom.ts) -- dotClassName defaults to stemClassName so existing
// callers that only set one color keep their prior look.
export function MushroomLogo({
  size = 24,
  shape = "button",
  capColor = "var(--brand-orange)",
  stemClassName = "text-card",
  dotClassName = stemClassName,
}: {
  size?: number;
  shape?: MushroomShape;
  capColor?: string;
  stemClassName?: string;
  dotClassName?: string;
}) {
  const { capD, stalkD, dots } = mushroomOutline(shape);
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      {stalkD ? (
        <path d={stalkD} fill="currentColor" className={stemClassName} />
      ) : (
        <rect x={40} y={52} width={20} height={34} rx={10} fill="currentColor" className={stemClassName} />
      )}
      <path d={capD} fill="currentColor" className="icon-glow" style={{ color: capColor }} />
      <g fill="currentColor" className={dotClassName}>
        {dots.map(([cx, cy, r], i) => (
          <circle key={i} cx={cx} cy={cy} r={r} />
        ))}
      </g>
    </svg>
  );
}
