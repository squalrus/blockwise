import type { MushroomCustomization, TopVisitor } from "@blockwise/types";
import { MushroomMark, hashSeed, mulberry32, mushroomConfigForUser, resolveMushroomConfig } from "@blockwise/ui";
import type { MushroomConfig, MushroomShape, SpotShape } from "@blockwise/ui";

// Purely decorative -- caps how many little mushrooms a field draws so an
// implausibly high count doesn't fill the card with hundreds of icons.
const MAX_MUSHROOMS = 40;
const FIELD_HEIGHT_PX = 40;
// BACKLOG.md Ref 94 "Mushroom size reflects recent check-in activity" -- a
// visitor's mushroom grows with their visit count within the mosaic's
// window, sqrt-scaled (same compression style as this component's own
// `count` prop) and capped so a handful of very-repeat visits doesn't blow
// a single mushroom out of proportion with the rest of the field.
const BASE_MUSHROOM_SIZE_PX = 18;
const MAX_VISITOR_SIZE_SCALE = 2.5;

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

// A small hand-painted wooden sign staked in the mosaic, naming the "Mayor"
// (BACKLOG.md Ref 94) -- nicknamed "Top Cap" for players -- the same
// visitor whose mushroom renders biggest in the field beside it. Caller
// (MushroomField below) only renders this when the server resolved a public
// Mayor -- private profiles are excluded server-side, mirroring the
// neighborhood leaderboard's own visibility rule -- so there's no empty or
// broken sign to account for here. `role="img"` collapses the placard +
// post into one glyph for screen readers, same pattern as BadgeIcon.
function MayorSign({ label }: { label: string }) {
  return (
    <div
      className="absolute top-0 right-1 z-10 flex -rotate-6 flex-col items-center"
      role="img"
      aria-label={`Top Cap: ${label}`}
      title={`Top Cap: ${label}`}
    >
      <div
        aria-hidden="true"
        className="max-w-[64px] truncate rounded-[2px] border border-wood-dark bg-gradient-to-b from-wood to-wood-dark px-1.5 py-0.5 text-[8px] leading-none font-bold tracking-tight text-wood-text shadow-sm"
      >
        {label}
      </div>
      <div aria-hidden="true" className="h-3 w-[3px] bg-wood-dark" />
    </div>
  );
}

// Rank-1/2/3 badge fill, matching the leaderboard tab's medal colors so the
// two ranked-visitor surfaces (this cluster and /neighborhoods/[slug]/leaderboard)
// read as the same podium language even though they rank by different
// metrics (visitCount here, points there).
const RANK_BADGE_CLASSES = ["bg-brand-amber", "bg-rank-silver", "bg-rank-bronze"];

// The neighborhood mosaic's "Top Caps" badge cluster (BACKLOG.md Ref 94/101
// redesign) -- up to 3 small pills naming the most frequent visitors within
// the mosaic's rolling window, stacked bottom-right over the field. Replaces
// the single wooden MayorSign for neighborhood cards (still used as-is for
// location cards, which only resolve one named visitor); unlike MayorSign,
// these aren't paired to any one mushroom's size, so a private/nameless
// visitor further down the ranking is simply absent rather than blanking a
// slot -- resolveTopVisitors (apps/api) already did that filtering
// server-side.
function TopCapsBadges({ visitors }: { visitors: TopVisitor[] }) {
  if (visitors.length === 0) return null;
  return (
    <div
      className="absolute right-2 bottom-2 z-10 flex gap-1.5"
      title="Top Caps — most check-ins in the last 60 days"
    >
      {visitors.map((visitor, i) => (
        <span
          key={visitor.username ?? visitor.displayName ?? i}
          className="flex items-center gap-1.5 rounded-full bg-card py-0.5 pr-2.5 pl-1 text-[10px] font-extrabold text-foreground shadow-sm"
        >
          <span
            className={`flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] text-ink ${RANK_BADGE_CLASSES[i]}`}
          >
            {i + 1}
          </span>
          {visitor.displayName ?? visitor.username} · {visitor.visitCount}
        </span>
      ))}
    </div>
  );
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
//
// `mushrooms` supplies real per-visitor configs for the distinctMushrooms
// mosaic -- position i (offset by `ownCount`, see below) renders
// mushrooms[i] when present, falling back to a positionally-fabricated skin
// otherwise (either because no list was passed at all, or because count
// exceeds how many real entries were fetched). Ignored when
// distinctMushrooms is false.
//
// `visitCounts` (BACKLOG.md Ref 94 "Mushroom size reflects recent check-in
// activity"), parallel to `mushrooms` by position, scales an individual
// mushroom's size by how many times that visitor checked in within the
// caller's window -- a "Mayor" mechanic that rewards coming back. Omitted
// entirely (e.g. the profile card's one-per-neighbor mosaic, BACKLOG.md Ref
// 97) or missing for a given position renders that mushroom at the base size.
//
// `ownCount` (profile summary card's merged field -- BACKLOG.md "how strong
// their presence is") lets the field mix both modes at once: the first
// `ownCount` positions always render `sharedMushroom` (one person's own
// skin) even when distinctMushrooms is true, and the rest render the mosaic
// -- so a single field can read as "my own growth" (level) plus "who I've
// connected with" (neighbor mushroom stamps) without one obscuring the
// other. Defaults to 0, which reproduces the old all-mosaic behavior
// unchanged for the neighborhood/location cards that don't pass it.
//
// `mayorLabel` (BACKLOG.md Ref 94's "Mayor"/"Top Cap") stakes a small
// wooden sign in the field naming the top-ranked mosaic visitor, when the
// caller resolved one (VenueDetail.mayor) -- omitted for the account card's
// own-growth field, which has no "mayor" of one person's own patch.
//
// `topVisitors` (BACKLOG.md Ref 101 redesign) renders the newer "Top Caps"
// badge cluster instead -- up to 3 named visitors rather than just the one --
// used by the neighborhood card (NeighborhoodProfile.top_visitors) in place
// of mayorLabel; a caller should pass one or the other, never both.
export function MushroomField({
  seed,
  count,
  ariaLabel,
  distinctMushrooms = false,
  customization = null,
  mushrooms,
  visitCounts,
  ownCount = 0,
  mayorLabel,
  topVisitors,
}: {
  seed: string;
  count: number;
  ariaLabel: string;
  distinctMushrooms?: boolean;
  customization?: MushroomCustomization | null;
  mushrooms?: MushroomConfig[];
  visitCounts?: number[];
  ownCount?: number;
  mayorLabel?: string | null;
  topVisitors?: TopVisitor[];
}) {
  const mushroomCount = Math.min(Math.max(Math.floor(count), 0), MAX_MUSHROOMS);
  if (mushroomCount === 0) return null;

  // Server-validated against the same enum a customizer save is checked
  // against (PATCH /me/profile), so the spotShape string is safe to trust as
  // a SpotShape here. shape falls back to "button" for rows saved before
  // that field existed (undefined, not just an unrecognized string).
  const config: MushroomConfig | null = customization
    ? {
        ...customization,
        shape: (customization.shape as MushroomShape | undefined) ?? "button",
        spotShape: customization.spotShape as SpotShape,
      }
    : null;
  const sharedMushroom = resolveMushroomConfig(seed, config);
  const layout = fieldLayout(seed, mushroomCount);
  const ownMushroomCount = Math.max(Math.floor(ownCount), 0);

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
          const isMosaicPosition = distinctMushrooms && i >= ownMushroomCount;
          const mushroom = isMosaicPosition
            ? (mushrooms?.[i - ownMushroomCount] ?? mushroomConfigForUser(`${seed}-mushroom-${i - ownMushroomCount}`))
            : sharedMushroom;
          const visitCount = isMosaicPosition ? visitCounts?.[i - ownMushroomCount] : undefined;
          const size = visitCount
            ? BASE_MUSHROOM_SIZE_PX * Math.min(Math.sqrt(visitCount), MAX_VISITOR_SIZE_SCALE)
            : BASE_MUSHROOM_SIZE_PX;
          return (
            <div
              key={i}
              className="absolute bottom-0"
              style={{ left: `${pos.leftPct}%`, transform: `translate(-50%, ${-pos.liftPx}px)` }}
            >
              <MushroomMark
                size={size}
                shape={mushroom.shape}
                cap={mushroom.cap}
                stalk={mushroom.stalk}
                spots={mushroom.spots}
                spotCount={mushroom.spotCount}
                spotShape={mushroom.spotShape}
              />
            </div>
          );
        })}
        {mayorLabel && <MayorSign label={mayorLabel} />}
        {topVisitors && <TopCapsBadges visitors={topVisitors} />}
      </div>
    </div>
  );
}
