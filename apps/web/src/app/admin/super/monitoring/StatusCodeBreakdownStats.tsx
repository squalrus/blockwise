import type { MonitoringStatusCodeBreakdown } from "@blockwise/types";
import { StatTile, MushroomIcon } from "../../../StatTile";
import { STATUS_CLASS_COLORS, STATUS_CLASS_LABELS, STATUS_CLASS_ORDER, type StatusCodeClass } from "./statusClasses";

type StatusClass = StatusCodeClass;

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
      {STATUS_CLASS_ORDER.map((statusClass) => (
        <button
          key={statusClass}
          type="button"
          onClick={() => onSelect(selected === statusClass ? null : statusClass)}
          className={`w-full rounded-2xl border-0 bg-transparent p-0 text-left transition-shadow ${
            selected === statusClass ? "ring-2 ring-foreground" : "hover:ring-2 hover:ring-border"
          }`}
        >
          <StatTile
            icon={<MushroomIcon color={STATUS_CLASS_COLORS[statusClass]} />}
            label={STATUS_CLASS_LABELS[statusClass]}
            value={counts.get(statusClass) ?? 0}
            color={STATUS_CLASS_COLORS[statusClass]}
          />
        </button>
      ))}
    </div>
  );
}
