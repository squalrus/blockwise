import type { MonitoringErrorsBySource } from "@blockwise/types";
import { StatTile, MushroomIcon } from "../../../StatTile";
import { ERROR_LOG_SOURCE_COLORS, ERROR_LOG_SOURCE_LABELS, ERROR_LOG_SOURCE_ORDER, type ErrorLogSource } from "./errorSources";

type Source = ErrorLogSource;

// Mirrors ActivityByTypeStats (admin/neighborhood analytics) for the tile
// styling. `errors_by_source` itself is never filtered by source (see the
// v11 migration), so these three counts stay the true breakdown regardless
// of the Source filter -- `selected` just rings whichever tile matches the
// Source pill in the shared header (see layout.tsx's MonitoringHeader) to
// tie the two together, on both Errors (where that pill is live) and
// Overview (plain summary, `selected` omitted).
export function ErrorsBySourceStats({ data, selected }: { data: MonitoringErrorsBySource[]; selected?: Source | null }) {
  const counts = new Map(data.map((d) => [d.source, d.count]));

  return (
    <div className="grid grid-cols-3 gap-3">
      {ERROR_LOG_SOURCE_ORDER.map((source) => (
        <div
          key={source}
          className={`rounded-2xl transition-shadow ${selected === source ? "ring-2 ring-foreground" : ""}`}
        >
          <StatTile
            icon={<MushroomIcon color={ERROR_LOG_SOURCE_COLORS[source]} />}
            label={ERROR_LOG_SOURCE_LABELS[source]}
            value={counts.get(source) ?? 0}
            color={ERROR_LOG_SOURCE_COLORS[source]}
          />
        </div>
      ))}
    </div>
  );
}
