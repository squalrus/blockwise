import type { MonitoringErrorsBySource } from "@blockwise/types";
import { StatTile, MushroomIcon } from "../../../StatTile";

const LABELS: Record<MonitoringErrorsBySource["source"], string> = {
  api: "API errors",
  web: "Web errors",
};
const COLORS: Record<MonitoringErrorsBySource["source"], string> = {
  api: "var(--brand-orange)",
  web: "var(--brand-purple)",
};
const ORDER: MonitoringErrorsBySource["source"][] = ["api", "web"];

// Mirrors ActivityByTypeStats (admin/neighborhood analytics) -- reuses the
// same StatTile rather than a chart, for a small count comparison.
export function ErrorsBySourceStats({ data }: { data: MonitoringErrorsBySource[] }) {
  const counts = new Map(data.map((d) => [d.source, d.count]));

  return (
    <div className="grid grid-cols-2 gap-3">
      {ORDER.map((source) => (
        <StatTile
          key={source}
          icon={<MushroomIcon color={COLORS[source]} />}
          label={LABELS[source]}
          value={counts.get(source) ?? 0}
          color={COLORS[source]}
        />
      ))}
    </div>
  );
}
