import type { MonitoringErrorsBySource } from "@blockwise/types";
import { StatTile, MushroomIcon } from "../../../StatTile";

type Source = MonitoringErrorsBySource["source"];

const LABELS: Record<Source, string> = {
  api: "API errors",
  web: "App errors",
  marketing: "Marketing errors",
};
const COLORS: Record<Source, string> = {
  api: "var(--brand-orange)",
  web: "var(--brand-purple)",
  marketing: "var(--brand-amber)",
};
const ORDER: Source[] = ["web", "api", "marketing"];

// Mirrors ActivityByTypeStats (admin/neighborhood analytics) for the tile
// styling. On the Errors page, `onSelect` is passed and the tiles double as
// a click-to-filter for errors_over_time/recent_errors (mirroring
// StatusCodeBreakdownStats' "tiles filter the list below" pattern) --
// on Overview, `onSelect` is omitted and they render as plain summary tiles.
export function ErrorsBySourceStats({
  data,
  selected,
  onSelect,
}: {
  data: MonitoringErrorsBySource[];
  selected?: Source | null;
  onSelect?: (source: Source | null) => void;
}) {
  const counts = new Map(data.map((d) => [d.source, d.count]));

  return (
    <div className="grid grid-cols-3 gap-3">
      {ORDER.map((source) => {
        const tile = (
          <StatTile
            icon={<MushroomIcon color={COLORS[source]} />}
            label={LABELS[source]}
            value={counts.get(source) ?? 0}
            color={COLORS[source]}
          />
        );

        if (!onSelect) return <div key={source}>{tile}</div>;

        return (
          <button
            key={source}
            type="button"
            onClick={() => onSelect(selected === source ? null : source)}
            className={`w-full rounded-2xl border-0 bg-transparent p-0 text-left transition-shadow ${
              selected === source ? "ring-2 ring-foreground" : "hover:ring-2 hover:ring-border"
            }`}
          >
            {tile}
          </button>
        );
      })}
    </div>
  );
}
