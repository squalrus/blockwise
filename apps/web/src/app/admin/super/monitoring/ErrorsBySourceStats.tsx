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
      {ORDER.map((source) => (
        <div
          key={source}
          className={`rounded-2xl transition-shadow ${selected === source ? "ring-2 ring-foreground" : ""}`}
        >
          <StatTile
            icon={<MushroomIcon color={COLORS[source]} />}
            label={LABELS[source]}
            value={counts.get(source) ?? 0}
            color={COLORS[source]}
          />
        </div>
      ))}
    </div>
  );
}
