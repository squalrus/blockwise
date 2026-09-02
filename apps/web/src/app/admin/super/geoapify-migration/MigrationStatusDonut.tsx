"use client";

import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

// A single ratio against a total (migrated / total_locations), not two
// independent categorical series -- rendered as a ring meter (dataviz
// skill: "a pie of 2 slices" is the anti-pattern; a same-hue meter with a
// track is the right form for this job). Both slices share brand-green:
// the filled arc at full strength, the track at low opacity standing in
// for "a lighter step of the same ramp" (mirrors the Area fillOpacity
// convention the monitoring charts already use, e.g. ErrorsOverTimeChart).
const COLOR = "var(--brand-green)";

interface StatusBreakdown {
  total: number;
  migrated: number;
}

interface MigrationStatusDonutProps {
  totalLocations: number;
  legacyCount: number;
  active: StatusBreakdown;
  hidden: StatusBreakdown;
}

// Linear meter row, same fill/track convention as the ring above -- for a
// per-status ratio that doesn't earn its own ring (dataviz skill: a single
// ratio against a total is a meter, and two more rings beside the main one
// would just repeat the same "circle = ratio" idea at lower signal).
function MeterRow({ label, breakdown }: { label: string; breakdown: StatusBreakdown }) {
  if (breakdown.total === 0) {
    return (
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-bold text-foreground">{label}</span>
        <span className="text-muted">None</span>
      </div>
    );
  }

  const percent = Math.round((breakdown.migrated / breakdown.total) * 100);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-bold text-foreground">{label}</span>
        <span className="text-muted">
          {percent}% · {breakdown.migrated}/{breakdown.total}
        </span>
      </div>
      <div className="relative h-1.5 w-full overflow-hidden rounded-full">
        {/* Track and fill are siblings, not parent/child -- CSS opacity
            cascades to descendants, so nesting the solid fill inside a
            faint track would wash the fill out to the same faintness. */}
        <div className="absolute inset-0 rounded-full" style={{ background: COLOR, opacity: 0.18 }} />
        <div className="absolute inset-y-0 left-0 rounded-full" style={{ background: COLOR, width: `${percent}%` }} />
      </div>
    </div>
  );
}

export function MigrationStatusDonut({ totalLocations, legacyCount, active, hidden }: MigrationStatusDonutProps) {
  const migratedCount = Math.max(0, totalLocations - legacyCount);
  const percent = totalLocations > 0 ? Math.round((migratedCount / totalLocations) * 100) : 0;

  const data = useMemo(
    () => [
      { key: "migrated", label: "Migrated", value: migratedCount, opacity: 1 },
      { key: "not_migrated", label: "Not migrated", value: legacyCount, opacity: 0.18 },
    ],
    [migratedCount, legacyCount]
  );

  if (totalLocations === 0) {
    return <p className="text-sm text-muted">No locations in this neighborhood yet.</p>;
  }

  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="relative h-36 w-36 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius="72%"
              outerRadius="100%"
              startAngle={90}
              endAngle={-270}
              stroke="var(--card)"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {data.map((d) => (
                <Cell key={d.key} fill={COLOR} fillOpacity={d.opacity} />
              ))}
            </Pie>
            <Tooltip
              content={({ active: tooltipActive, payload }) => {
                if (!tooltipActive || !payload?.length) return null;
                const row = payload[0].payload as (typeof data)[number];
                return (
                  <div
                    style={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      padding: "6px 10px",
                      fontSize: 12,
                      fontWeight: 700,
                      color: "var(--foreground)",
                    }}
                  >
                    {row.label}: {row.value}
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-heading text-2xl font-extrabold text-foreground">{percent}%</span>
          <span className="text-[11px] font-bold text-muted">migrated</span>
        </div>
      </div>

      <dl className="flex flex-col gap-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: COLOR, opacity: 1 }} />
          <dt className="font-bold text-foreground">Migrated</dt>
          <dd className="text-muted">{migratedCount}</dd>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: COLOR, opacity: 0.18 }} />
          <dt className="font-bold text-foreground">Not migrated</dt>
          <dd className="text-muted">{legacyCount}</dd>
        </div>
        <div className="text-xs text-muted">{totalLocations} total</div>
      </dl>

      <div className="flex min-w-[180px] flex-1 flex-col gap-2.5 border-l border-border pl-6">
        <MeterRow label="Active locations" breakdown={active} />
        <MeterRow label="Hidden locations" breakdown={hidden} />
      </div>
    </div>
  );
}
