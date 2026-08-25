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

type StatusClass = MonitoringStatusCodeBreakdown["status_class"];

// Tiles double as filters for the "Recent requests" table below -- clicking
// one selects it (click again to clear), rather than adding a second row of
// pills that duplicates the same four values.
export function StatusCodeBreakdownStats({
  data,
  selected,
  onSelect,
}: {
  data: MonitoringStatusCodeBreakdown[];
  selected: StatusClass | null;
  onSelect: (statusClass: StatusClass | null) => void;
}) {
  const counts = new Map(data.map((d) => [d.status_class, d.count]));

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {ORDER.map((statusClass) => (
        <button
          key={statusClass}
          type="button"
          onClick={() => onSelect(selected === statusClass ? null : statusClass)}
          className={`w-full rounded-2xl border-0 bg-transparent p-0 text-left transition-shadow ${
            selected === statusClass ? "ring-2 ring-foreground" : "hover:ring-2 hover:ring-border"
          }`}
        >
          <StatTile
            icon={<MushroomIcon color={COLORS[statusClass]} />}
            label={LABELS[statusClass]}
            value={counts.get(statusClass) ?? 0}
            color={COLORS[statusClass]}
          />
        </button>
      ))}
    </div>
  );
}
