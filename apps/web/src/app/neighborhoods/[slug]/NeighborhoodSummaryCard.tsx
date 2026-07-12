import type { NeighborhoodProfile, SocialLinks } from "@blockwise/types";
import { MushroomField } from "../../MushroomField";
import { StatCard } from "../../StatCard";

const SOCIAL_PLATFORM_LABELS: { key: keyof SocialLinks; label: string }[] = [
  { key: "instagram", label: "Instagram" },
  { key: "twitter", label: "Twitter / X" },
  { key: "tiktok", label: "TikTok" },
  { key: "facebook", label: "Facebook" },
  { key: "website", label: "Website" },
];

// Extracted from the neighborhood profile layout (BACKLOG.md Ref 44) so it
// can be rendered standalone in /dev/components alongside the location and
// person profile summary cards, self-contained in its own card background
// like ProfileSummaryCard rather than sitting bare on the page. `actions`
// holds the page-level Join/Manage buttons -- omitted here means no action
// row, matching how those buttons depend on auth state fetched by the
// caller.
export function NeighborhoodSummaryCard({
  neighborhood,
  actions,
}: {
  neighborhood: NeighborhoodProfile;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 overflow-hidden rounded-2xl bg-card-alt px-5 pt-4 pb-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground">
            {neighborhood.name}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {neighborhood.city}, {neighborhood.state}
          </p>
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>

      {neighborhood.description && (
        <p className="text-sm text-body-text">{neighborhood.description}</p>
      )}

      <div className="grid grid-cols-2 gap-2.5">
        <StatCard value={neighborhood.venue_count} label="Businesses" accent="orange" />
        <StatCard value={neighborhood.poi_count} label="Points of interest" accent="green" />
        <StatCard value={neighborhood.member_count} label="Members" accent="purple" />
        <StatCard value={neighborhood.checkin_count} label="Check-ins" accent="amber" />
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

      {/* Grows with total check-ins rather than 1:1 like level -- a
          neighborhood can rack up thousands, so sqrt keeps the field
          differentiated across neighborhoods instead of every established
          one instantly maxing out the cap. */}
      <MushroomField
        seed={neighborhood.id}
        count={Math.sqrt(neighborhood.checkin_count)}
        ariaLabel={`${neighborhood.checkin_count} check-ins`}
        distinctMushrooms
      />
    </div>
  );
}
