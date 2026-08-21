import type { VenueAnalyticsActivityByType } from "@blockwise/types";
import { StatTile, MushroomIcon } from "../../../../StatTile";

const LABELS: Record<VenueAnalyticsActivityByType["event_type"], string> = {
  checkin: "Check-ins",
  favorite: "Favorites",
  challenge_completion: "Challenges completed",
};
const COLORS: Record<VenueAnalyticsActivityByType["event_type"], string> = {
  checkin: "var(--brand-amber)",
  favorite: "var(--brand-purple)",
  challenge_completion: "var(--brand-orange)",
};
const ORDER: VenueAnalyticsActivityByType["event_type"][] = ["checkin", "favorite", "challenge_completion"];

// Three numbers side by side, reusing the same StatTile as the Overview tab
// -- mirrors admin/neighborhood/[neighborhoodSlug]/analytics/ActivityByTypeStats.tsx.
export function ActivityByTypeStats({ data }: { data: VenueAnalyticsActivityByType[] }) {
  const counts = new Map(data.map((d) => [d.event_type, d.count]));

  return (
    <div className="grid grid-cols-3 gap-3">
      {ORDER.map((type) => (
        <StatTile
          key={type}
          icon={<MushroomIcon color={COLORS[type]} />}
          label={LABELS[type]}
          value={counts.get(type) ?? 0}
          color={COLORS[type]}
        />
      ))}
    </div>
  );
}
