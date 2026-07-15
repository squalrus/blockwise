import type { SocialLinks, VenueDetail } from "@blockwise/types";
import { MushroomField } from "../../MushroomField";
import { SlideToCheckIn } from "../../SlideToCheckIn";
import { StatCard } from "../../StatCard";

const SOCIAL_PLATFORM_LABELS: { key: keyof SocialLinks; label: string }[] = [
  { key: "instagram", label: "Instagram" },
  { key: "twitter", label: "Twitter / X" },
  { key: "tiktok", label: "TikTok" },
  { key: "facebook", label: "Facebook" },
  { key: "website", label: "Website" },
];

// Extracted from the merged business/POI detail page (BACKLOG.md "POIs and
// venues managed almost the same") so it can be rendered standalone in
// /dev/components alongside the neighborhood and person profile summary
// cards, branching on `location.kind` the same way the page does and
// self-contained in its own card background like ProfileSummaryCard rather
// than sitting bare on the page. Check-ins and favorites are shown for both
// kinds now that both stats are meaningful either way. `favoriteAction` holds
// the page-level FavoriteButton for business kind -- omitted here means no
// action row, matching how it depends on device-scoped favorite state
// fetched by the caller.
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
      <div className="flex flex-wrap items-center gap-2">
        {isBusiness ? (
          location.category_name && (
            <span className="rounded-full bg-brand-amber px-2.5 py-1 text-xs font-extrabold text-ink">
              {location.category_name}
            </span>
          )
        ) : (
          <span className="rounded-full border border-border bg-card px-2.5 py-1 text-xs font-extrabold text-muted-strong">
            {location.type}
          </span>
        )}
        {location.enrichment?.rating != null && (
          <span className="ml-auto flex items-center gap-1 text-sm font-extrabold text-foreground">
            ★ {location.enrichment.rating}
          </span>
        )}
      </div>

      <div>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground">
          {location.name}
        </h1>
        <p className="mt-1 text-[12.5px] font-bold text-muted">{location.address}</p>
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

      <div className="grid grid-cols-2 gap-2.5">
        <StatCard value={location.checkin_count} label="Check-ins" accent="green" />
        <StatCard value={location.favorite_count} label="Favorites" accent="orange" />
      </div>

      {isBusiness && favoriteAction && <div className="flex gap-2.5">{favoriteAction}</div>}

      <SlideToCheckIn locationId={location.id} />

      {/* Grows with check-ins like the neighborhood card -- sqrt keeps a
          long-running popular spot's field differentiated from a brand-new
          one instead of both instantly maxing out the cap. */}
      <MushroomField
        seed={location.id}
        count={Math.sqrt(location.checkin_count)}
        ariaLabel={`${location.checkin_count} check-ins`}
        distinctMushrooms
        mushrooms={location.recent_checkin_mushrooms}
      />
    </div>
  );
}
