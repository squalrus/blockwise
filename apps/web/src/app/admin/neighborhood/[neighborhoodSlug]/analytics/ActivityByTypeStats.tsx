import type { NeighborhoodAnalyticsActivityByType } from "@blockwise/types";
import { StatTile, MushroomIcon } from "../../../../StatTile";

const LABELS: Record<NeighborhoodAnalyticsActivityByType["event_type"], string> = {
  checkin: "Check-ins",
  favorite: "Favorites",
  challenge_completion: "Challenges completed",
};
const COLORS: Record<NeighborhoodAnalyticsActivityByType["event_type"], string> = {
  checkin: "var(--brand-amber)",
  favorite: "var(--brand-purple)",
  challenge_completion: "var(--brand-orange)",
};
const ORDER: NeighborhoodAnalyticsActivityByType["event_type"][] = [
  "checkin",
  "favorite",
  "challenge_completion",
];

// Three numbers side by side reads more clearly than a 3-slice donut here,
// and reuses the same StatTile the Overview tab already uses -- no new
// categorical palette to validate for what's fundamentally a small count
// comparison, not identity-heavy chart data.
export function ActivityByTypeStats({ data }: { data: NeighborhoodAnalyticsActivityByType[] }) {
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
