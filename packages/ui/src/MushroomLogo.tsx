// Spored's mushroom mark: a rounded cap (with the brand's "classic" spot
// pattern) over a short stem -- the four-part anatomy documented on the
// /brand guidelines page, minus the background swatch. Reused as the nav
// logo, map/list pins, and the slide-to-check-in thumb icon.
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
  capColor = "var(--brand-orange)",
  stemClassName = "text-card",
  dotClassName = stemClassName,
}: {
  size?: number;
  capColor?: string;
  stemClassName?: string;
  dotClassName?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <path
        d="M4 22 Q4 6 20 6 Q36 6 36 22 Z"
        fill="currentColor"
        className="icon-glow"
        style={{ color: capColor }}
      />
      <rect x="16" y="21" width="8" height="15" rx="4" fill="currentColor" className={stemClassName} />
      <g fill="currentColor" className={dotClassName}>
        <circle cx="13" cy="14" r="2.6" />
        <circle cx="21" cy="10" r="1.9" />
        <circle cx="26" cy="16" r="2.3" />
      </g>
    </svg>
  );
}
