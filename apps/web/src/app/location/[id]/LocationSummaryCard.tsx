import type { SocialLinks, VenueDetail } from "@blockwise/types";
import { MushroomLogo } from "@blockwise/ui";
import { EntityTile } from "../../EntityTile";
import { MushroomField } from "../../MushroomField";
import { pinColorFor, shapeFor } from "../../PlaceListItem";
import { SlideToCheckIn } from "../../SlideToCheckIn";

const SOCIAL_PLATFORM_LABELS: { key: keyof SocialLinks; label: string }[] = [
  { key: "instagram", label: "Instagram" },
  { key: "twitter", label: "Twitter / X" },
  { key: "tiktok", label: "TikTok" },
  { key: "facebook", label: "Facebook" },
  { key: "website", label: "Website" },
];

// BACKLOG.md Ref 101 redesign: divided stat strip, mirroring
// NeighborhoodSummaryCard's own StatTile -- flat text over a border-t rule
// instead of separate boxed StatCard tiles, so the header card reads as one
// continuous surface.
function StatTile({ value, label, accent, divider }: { value: React.ReactNode; label: string; accent: string; divider?: boolean }) {
  return (
    <div className={`px-1 py-1 text-center ${divider ? "border-r border-border" : ""}`}>
      <p className={`font-heading text-lg font-extrabold ${accent}`}>{value}</p>
      <p className="text-[10.5px] font-bold text-muted">{label}</p>
    </div>
  );
}

// Extracted from the merged business/POI detail page (BACKLOG.md "POIs and
// venues managed almost the same") so it can be rendered standalone in
// /admin/super/components alongside the neighborhood and person profile summary
// cards, branching on `location.kind` the same way the page does and
// self-contained in its own card background like ProfileSummaryCard rather
// than sitting bare on the page. Check-ins and favorites are shown for both
// kinds now that both stats are meaningful either way, and `favoriteAction`
// (the page-level FavoriteButton) follows the same rule -- favoriting isn't
// business-only, so this renders for a POI too. Sits in the header's upper
// right next to the name, mirroring NeighborhoodSummaryCard's `actions` and
// ProfileSummaryCard's `action` placement. Omitted here means no action,
// matching how it depends on auth state fetched by the caller.
export function LocationSummaryCard({
  location,
  favoriteAction,
}: {
  location: VenueDetail;
  favoriteAction?: React.ReactNode;
}) {
  const isBusiness = location.kind === "business";

  return (
    <div className="flex flex-col gap-2.5 overflow-hidden rounded-2xl bg-card-alt px-5 pt-4 pb-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3.5">
          {/* Venue identity mark (BACKLOG.md Ref 101 redesign): the same
              deterministic per-id pin shape/color PlaceListItem uses in every
              venue/POI list across the app, so this place's icon reads as
              the same place wherever it's shown. items-start (not
              items-center) on the row above keeps this pinned to the top
              even when the name/address wrap to two lines. The tile's ring
              and corner chip mark business vs. POI (previously identical
              orange tiles for both) -- the mushroom mark itself is unchanged. */}
          <EntityTile kind={isBusiness ? "business" : "poi"}>
            <MushroomLogo size={38} shape={shapeFor(location.id)} capColor={pinColorFor(location.id)} stemClassName="text-muted-strong" />
          </EntityTile>
          <div>
            <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground">
              {location.name}
            </h1>
            <p className="mt-1 text-[12.5px] font-bold text-muted">{location.address}</p>
          </div>
        </div>
        {favoriteAction && <div className="flex shrink-0 items-center gap-2">{favoriteAction}</div>}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {isBusiness ? (
          location.category_name && (
            <span className="rounded-full bg-brand-amber px-2.5 py-1 text-xs font-extrabold text-ink">
              {location.category_name}
            </span>
          )
        ) : (
          // Purple -- green (NeighborhoodSummaryCard's "Points of interest"
          // stat accent) would clash with the favorited state of the
          // favorite button right beside this pill, which is also green.
          <span className="rounded-full bg-brand-purple px-2.5 py-1 text-xs font-extrabold text-on-accent">
            Point of interest
          </span>
        )}
        {/* "Open now · until X" pill (BACKLOG.md Ref 101 redesign) --
            open_status is computed server-side (apps/api's resolveOpenStatus)
            from the same cached hours VenueHours parses in the About tab, so
            this renders correctly on first paint with no client-side
            recomputation to risk a hydration mismatch against. */}
        {location.open_status && (
          <span className="rounded-full border border-border bg-card px-2.5 py-1 text-xs font-extrabold text-muted-strong">
            {location.open_status.open
              ? location.open_status.time
                ? `Open now · until ${location.open_status.time}`
                : "Open now"
              : location.open_status.time
                ? `Closed · opens ${location.open_status.time}`
                : "Closed"}
          </span>
        )}
      </div>

      {!isBusiness && location.description && (
        <p className="text-sm text-body-text">{location.description}</p>
      )}

      {isBusiness && Object.keys(location.social_links).length > 0 && (
        <div className="flex flex-wrap gap-4 text-sm font-bold">
          {SOCIAL_PLATFORM_LABELS.filter(({ key }) => location.social_links[key]).map(({ key, label }) => (
            <a
              key={key}
              href={location.social_links[key]}
              target="_blank"
              rel="noreferrer"
              className="text-brand-purple hover:text-brand-orange"
            >
              {label}
            </a>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 border-t border-border pt-3.5">
        <StatTile value={location.checkin_count} label="Check-ins" accent="text-brand-green" divider />
        <StatTile value={location.favorite_count} label="Favorites" accent="text-brand-orange" />
      </div>

      <SlideToCheckIn locationId={location.id} />

      {/* BACKLOG.md Ref 94: one mushroom per distinct visitor within the
          rolling 60-day window (not sqrt-scaled against the all-time total
          check-in stat above), each sized by that visitor's own visit count
          within the window. BACKLOG.md Ref 101 redesign: topVisitors renders
          the "Top Caps" badge cluster (up to 3 named visitors), mirroring
          NeighborhoodSummaryCard. */}
      <MushroomField
        seed={location.id}
        count={location.recent_checkin_mushrooms.length}
        ariaLabel={`${location.checkin_count} check-ins`}
        distinctMushrooms
        mushrooms={location.recent_checkin_mushrooms.map((m) => m.mushroom)}
        visitCounts={location.recent_checkin_mushrooms.map((m) => m.visitCount)}
        topVisitors={location.top_visitors}
      />
    </div>
  );
}
