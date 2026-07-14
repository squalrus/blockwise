import type { MushroomCustomization } from "@blockwise/types";
import { MushroomMark, hashSeed, mulberry32, mushroomConfigForUser, resolveMushroomConfig } from "@blockwise/ui";
import type { MushroomConfig, SpotShape } from "@blockwise/ui";

// Purely decorative -- caps how many little mushrooms a field draws so an
// implausibly high count doesn't fill the card with hundreds of icons.
const MAX_MUSHROOMS = 40;
const FIELD_HEIGHT_PX = 40;

// Scattered (not gridded) placement, stable per seed -- each mushroom gets a
// random spot within its own slice of the width so they land unevenly like
// they actually grew there, without ever overlapping their neighbors.
// liftPx ranges across the full field height so a mushroom can grow
// anywhere on the green, from the bottom edge up to the very top -- only
// the bottom of its stalk (where it's anchored via bottom-0 below) needs to
// stay on the green; the rest of it is free to rise above the field into
// the hill silhouette, same as it would growing on a real slope.
function fieldLayout(seed: string, count: number): { leftPct: number; liftPx: number }[] {
  const rnd = mulberry32(hashSeed(`${seed}-field`));
  const slice = 100 / count;
  return Array.from({ length: count }, (_, i) => ({
    leftPct: slice * i + slice * 0.2 + rnd() * slice * 0.6,
    liftPx: rnd() * FIELD_HEIGHT_PX,
  }));
}

// A growing patch of mushrooms along the bottom edge of a profile summary
// card -- shared by the account (grows with level), neighborhood, and
// location cards (both grow with check-in count) so all three visibly
// "grow" the more activity they've seen. `count` is the number to draw,
// already scaled and rounded by the caller against whatever metric it grows
// from -- this component only handles capping, scatter, and rendering.
// Renders nothing at count 0, so a brand-new entity's card just ends at its
// stat grid instead of showing an empty dirt strip.
//
// `distinctMushrooms` switches each mushroom's cap/stalk/spots from one
// skin shared by the whole field to a unique skin per mushroom, seeded by
// its position rather than by `seed` -- a neighborhood/location's check-ins
// come from many different foragers, so its field should read as a mosaic
// of visitors rather than one person's skin repeated (which is exactly what
// the account card's field should do, since there it *is* one person's own
// skin growing). `customization` (BACKLOG.md Ref 75) overrides that shared
// skin with the account's saved customizer choice, if any -- only meaningful
// when `distinctMushrooms` is false, since the mosaic case isn't any one
// person's look to begin with.
export function MushroomField({
  seed,
  count,
  ariaLabel,
  distinctMushrooms = false,
  customization = null,
}: {
  seed: string;
  count: number;
  ariaLabel: string;
  distinctMushrooms?: boolean;
  customization?: MushroomCustomization | null;
}) {
  const mushroomCount = Math.min(Math.max(Math.floor(count), 0), MAX_MUSHROOMS);
  if (mushroomCount === 0) return null;

  // Server-validated against the same enum a customizer save is checked
  // against (PATCH /me/profile), so the spotShape string is safe to trust as
  // a SpotShape here.
  const config: MushroomConfig | null = customization
    ? { ...customization, spotShape: customization.spotShape as SpotShape }
    : null;
  const sharedMushroom = resolveMushroomConfig(seed, config);
  const layout = fieldLayout(seed, mushroomCount);

  return (
    <div className="-mx-5 -mb-6">
      <svg viewBox="0 0 400 16" preserveAspectRatio="none" className="block h-4 w-full text-brand-green/55" aria-hidden="true">
        <path
          d="M0 16 C 25 0, 50 0, 75 8 S 125 16, 150 8 S 200 0, 225 8 S 275 16, 300 8 S 350 0, 375 8 S 400 16, 400 8 L 400 16 Z"
          fill="currentColor"
        />
      </svg>
      <div className="relative bg-brand-green/55" style={{ height: FIELD_HEIGHT_PX }} aria-label={ariaLabel}>
        {layout.map((pos, i) => {
          const mushroom = distinctMushrooms ? mushroomConfigForUser(`${seed}-mushroom-${i}`) : sharedMushroom;
          return (
            <div
              key={i}
              className="absolute bottom-0"
              style={{ left: `${pos.leftPct}%`, transform: `translate(-50%, ${-pos.liftPx}px)` }}
            >
              <MushroomMark
                size={18}
                cap={mushroom.cap}
                stalk={mushroom.stalk}
                spots={mushroom.spots}
                spotCount={mushroom.spotCount}
                spotShape={mushroom.spotShape}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
