import type { MonitoringStatusCodeBreakdown } from "@blockwise/types";
import { StatTile, MushroomIcon } from "../../../StatTile";

const LABELS: Record<MonitoringStatusCodeBreakdown["status_class"], string> = {
  "2xx": "2xx OK",
  "3xx": "3xx Redirect",
  "4xx": "4xx Client error",
  "5xx": "5xx Server error",
};
// 2xx/5xx reuse the same green/orange "good/bad" hues as the rest of the
// dashboard (green also backs healthy avg latency, orange also backs the
// errors chart) so the signal reads consistently across sections.
const COLORS: Record<MonitoringStatusCodeBreakdown["status_class"], string> = {
  "2xx": "var(--brand-green)",
  "3xx": "var(--brand-purple)",
  "4xx": "var(--brand-amber)",
  "5xx": "var(--brand-orange)",
};
const ORDER: MonitoringStatusCodeBreakdown["status_class"][] = ["2xx", "3xx", "4xx", "5xx"];

export function StatusCodeBreakdownStats({ data }: { data: MonitoringStatusCodeBreakdown[] }) {
  const counts = new Map(data.map((d) => [d.status_class, d.count]));

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {ORDER.map((statusClass) => (
        <StatTile
          key={statusClass}
          icon={<MushroomIcon color={COLORS[statusClass]} />}
          label={LABELS[statusClass]}
          value={counts.get(statusClass) ?? 0}
          color={COLORS[statusClass]}
        />
      ))}
    </div>
  );
}
