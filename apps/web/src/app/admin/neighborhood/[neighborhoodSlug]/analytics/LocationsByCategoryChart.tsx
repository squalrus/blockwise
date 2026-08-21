"use client";

import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList } from "recharts";
import type { NeighborhoodAnalyticsLocationsByCategoryGroup } from "@blockwise/types";

const COLOR = "var(--brand-green)";

interface Row {
  category_group: string;
  total: number;
  business: number;
  poi: number;
}

// Category identity rides the y-axis label, not color -- count is a
// magnitude, so one hue is correct here (dataviz skill: color follows the
// job the data does). Business/POI split still surfaces, via the tooltip.
export function LocationsByCategoryChart({ data }: { data: NeighborhoodAnalyticsLocationsByCategoryGroup[] }) {
  const rows = useMemo<Row[]>(() => {
    const byGroup = new Map<string, Row>();
    for (const d of data) {
      const row = byGroup.get(d.category_group) ?? {
        category_group: d.category_group,
        total: 0,
        business: 0,
        poi: 0,
      };
      row.total += d.count;
      if (d.kind === "business") row.business += d.count;
      else row.poi += d.count;
      byGroup.set(d.category_group, row);
    }
    return Array.from(byGroup.values()).sort((a, b) => b.total - a.total);
  }, [data]);

  if (rows.length === 0) {
    return <p className="text-sm text-muted">No active locations yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(160, rows.length * 40)}>
      <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 24, left: 4, bottom: 4 }}>
        <XAxis type="number" hide allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="category_group"
          tick={{ fill: "var(--foreground)", fontSize: 12, fontWeight: 600 }}
          axisLine={false}
          tickLine={false}
          width={140}
        />
        <Tooltip
          cursor={{ fill: "var(--muted)", fillOpacity: 0.08 }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const row = payload[0].payload as Row;
            return (
              <div
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: "8px 12px",
                  fontSize: 12,
                }}
              >
                <div style={{ fontWeight: 700, color: "var(--foreground)" }}>{row.category_group}</div>
                <div style={{ color: COLOR }}>{row.total} locations</div>
                <div style={{ color: "var(--muted)" }}>
                  {row.business} business{row.business === 1 ? "" : "es"} · {row.poi} POI{row.poi === 1 ? "" : "s"}
                </div>
              </div>
            );
          }}
        />
        <Bar dataKey="total" fill={COLOR} radius={[0, 4, 4, 0]} maxBarSize={22}>
          <LabelList dataKey="total" position="right" fill="var(--foreground)" fontSize={12} fontWeight={700} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
