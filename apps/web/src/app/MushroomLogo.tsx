// Spored's mushroom mark: a rounded cap over a short stem, reused as the nav
// logo, map/list pins, and the slide-to-check-in thumb icon.
//
// capColor should normally be a `var(--brand-*)` reference (not a raw hex) so
// the cap re-colors and glows automatically when the dark theme's brighter
// accent palette kicks in (see .icon-glow in globals.css) -- a literal hex
// would freeze the icon to one theme's shade. stemClassName is a Tailwind
// text-color utility (default "text-card") so the stem blends into whatever
// surface the icon sits on in both themes.
export function MushroomLogo({
  size = 24,
  capColor = "var(--brand-orange)",
  stemClassName = "text-card",
}: {
  size?: number;
  capColor?: string;
  stemClassName?: string;
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
    </svg>
  );
}
