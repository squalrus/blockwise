import type { NeighborhoodProfile, SocialLinks } from "@blockwise/types";
import { MushroomLogo } from "@blockwise/ui";
import { EntityTile } from "../../EntityTile";
import { MushroomField } from "../../MushroomField";

const SOCIAL_PLATFORM_LABELS: { key: keyof SocialLinks; label: string }[] = [
  { key: "instagram", label: "Instagram" },
  { key: "twitter", label: "Twitter / X" },
  { key: "tiktok", label: "TikTok" },
  { key: "facebook", label: "Facebook" },
  { key: "website", label: "Website" },
];

// BACKLOG.md Ref 101 redesign: divided 4-column stat strip, mirroring
// ProfileSummaryCard's StatTile -- flat text over a border-t rule instead of
// the old 2x2 grid of separate StatCard boxes, so the header card reads as
// one continuous surface rather than a card full of smaller cards. No `href`
// here (unlike StatTile) -- Businesses/POIs both already resolve to the same
// Locations tab, and Members/Check-ins have no tab of their own to link to.
function StatTile({ value, label, accent, divider }: { value: number; label: string; accent: string; divider?: boolean }) {
  return (
    <div className={`px-1 py-1 text-center ${divider ? "border-r border-border" : ""}`}>
      <p className={`font-heading text-lg font-extrabold ${accent}`}>{value}</p>
      <p className="text-[10.5px] font-bold text-muted">{label}</p>
    </div>
  );
}

// Extracted from the neighborhood profile layout (BACKLOG.md Ref 44) so it
// can be rendered standalone in /admin/super/components alongside the location and
// person profile summary cards, self-contained in its own card background
// like ProfileSummaryCard rather than sitting bare on the page. `actions`
// holds the page-level Join button -- omitted here means no action row,
// matching how that button depends on auth state fetched by the caller.
export function NeighborhoodSummaryCard({
  neighborhood,
  actions,
}: {
  neighborhood: NeighborhoodProfile;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3.5 overflow-hidden rounded-2xl bg-card-alt px-5 pt-4 pb-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3.5">
          {/* Neighborhood identity mark (BACKLOG.md Ref 101 redesign): an
              enoki cluster on a green tile with a leaf corner chip,
              distinguishing the neighborhood header from a person's
              avatar-led card (ProfileSummaryCard) or a location's business/
              POI tile (LocationSummaryCard). */}
          <EntityTile kind="neighborhood">
            <MushroomLogo size={38} shape="enoki" capColor="var(--brand-green)" stemClassName="text-muted-strong" />
          </EntityTile>
          <div>
            <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground">
              {neighborhood.name}
            </h1>
            <p className="mt-1 text-sm text-muted">
              {neighborhood.city}, {neighborhood.state}
            </p>
          </div>
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>

      {neighborhood.description && (
        <p className="text-sm text-body-text">{neighborhood.description}</p>
      )}

      <div className="grid grid-cols-4 border-t border-border pt-3.5">
        <StatTile value={neighborhood.venue_count} label="Businesses" accent="text-brand-orange" divider />
        <StatTile value={neighborhood.poi_count} label="Points of interest" accent="text-brand-green" divider />
        <StatTile value={neighborhood.member_count} label="Members" accent="text-brand-purple" divider />
        <StatTile value={neighborhood.checkin_count} label="Check-ins" accent="text-brand-amber" />
      </div>

      {Object.keys(neighborhood.social_links).length > 0 && (
        <div className="flex flex-wrap gap-4 text-sm font-bold">
          {SOCIAL_PLATFORM_LABELS.filter(({ key }) => neighborhood.social_links[key]).map(
            ({ key, label }) => (
              <a
                key={key}
                href={neighborhood.social_links[key]}
                target="_blank"
                rel="noreferrer"
                className="text-brand-purple hover:text-brand-orange"
              >
                {label}
              </a>
            )
          )}
        </div>
      )}

      {/* BACKLOG.md Ref 94: one mushroom per distinct visitor within the
          rolling 60-day window (not sqrt-scaled against the all-time total
          check-in stat above), each sized by that visitor's own visit count
          within the window. BACKLOG.md Ref 101 redesign: topVisitors renders
          the "Top Caps" badge cluster (up to 3 named visitors) in place of
          the single wooden Mayor sign LocationSummaryCard still uses. */}
      <MushroomField
        seed={neighborhood.id}
        count={neighborhood.recent_checkin_mushrooms.length}
        ariaLabel={`${neighborhood.checkin_count} check-ins`}
        distinctMushrooms
        mushrooms={neighborhood.recent_checkin_mushrooms.map((m) => m.mushroom)}
        visitCounts={neighborhood.recent_checkin_mushrooms.map((m) => m.visitCount)}
        topVisitors={neighborhood.top_visitors}
      />
    </div>
  );
}
