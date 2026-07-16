import { BRAND_ORANGE, MUSHROOM_STALK_COCOA, MUSHROOM_STALK_CREAM } from "@blockwise/types";

// A loading indicator built from Spored's own mushroom mark (see
// MushroomLogo) instead of a generic spinner: the stalk pops in, then the
// cap, then the three cap spots in succession -- each with a little
// overshoot for a springy feel -- holds fully formed for a beat, then the
// whole mark resets to nothing and the sequence repeats. Self-contained (a
// scoped <style> tag, not a Tailwind utility or an apps/web globals.css
// keyframe) so it renders identically from any app that imports
// @blockwise/ui without also sharing that app's global stylesheet.
//
// Colors are fixed to the brand mark's own palette (marketing's /brand
// page): Chanterelle cap, Cream spots, Cocoa stalk -- except the stalk
// swaps to Cream on a dark background (Cocoa would be nearly invisible
// there), mirroring globals.css's light/dark selector pair so it tracks the
// app's theme toggle without needing apps/web's stylesheet in scope.
const CYCLE_SECONDS = 2.4;

function popKeyframes(name: string, appearAt: number, overshootAt: number, settleAt: number): string {
  // Every part shares the same hold/reset tail (settle -> 88% steady, then
  // 88%-94% shrink back out, 94%-100%/0% invisible) -- appearAt/overshootAt/
  // settleAt are the only per-part knobs, staggering when each one pops in.
  return `
    @keyframes ${name} {
      0%, ${appearAt}% { opacity: 0; transform: scale(0); }
      ${overshootAt}% { opacity: 1; transform: scale(1.3); }
      ${settleAt}%, 88% { opacity: 1; transform: scale(1); }
      94%, 100% { opacity: 0; transform: scale(0); }
    }
  `;
}

const STALK_THEME_CSS = `
  .mushroom-loader-stalk { color: ${MUSHROOM_STALK_COCOA}; }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) .mushroom-loader-stalk { color: ${MUSHROOM_STALK_CREAM}; }
  }
  :root[data-theme="dark"] .mushroom-loader-stalk { color: ${MUSHROOM_STALK_CREAM}; }
`;

export function MushroomLoader({ size = 56, label = "Loading" }: { size?: number; label?: string }) {
  const partStyle = (animationName: string) => ({
    transformBox: "fill-box" as const,
    transformOrigin: "center",
    animation: `${animationName} ${CYCLE_SECONDS}s ease-in-out infinite`,
  });

  return (
    <span role="status" aria-label={label} style={{ display: "inline-block", width: size, height: size }}>
      <style>
        {STALK_THEME_CSS +
          popKeyframes("mushroom-loader-stem", 8, 13, 17) +
          popKeyframes("mushroom-loader-cap", 22, 27, 31) +
          popKeyframes("mushroom-loader-spot1", 40, 45, 49) +
          popKeyframes("mushroom-loader-spot2", 50, 55, 59) +
          popKeyframes("mushroom-loader-spot3", 60, 65, 69)}
      </style>
      <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
        <rect
          x="16"
          y="21"
          width="8"
          height="15"
          rx="4"
          fill="currentColor"
          className="mushroom-loader-stalk"
          style={partStyle("mushroom-loader-stem")}
        />
        <path
          d="M4 22 Q4 6 20 6 Q36 6 36 22 Z"
          fill={BRAND_ORANGE}
          style={partStyle("mushroom-loader-cap")}
        />
        <g fill={MUSHROOM_STALK_CREAM}>
          <circle cx="13" cy="14" r="2.6" style={partStyle("mushroom-loader-spot1")} />
          <circle cx="21" cy="10" r="1.9" style={partStyle("mushroom-loader-spot2")} />
          <circle cx="26" cy="16" r="2.3" style={partStyle("mushroom-loader-spot3")} />
        </g>
      </svg>
    </span>
  );
}
