"use client";

import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import type { VenueAnalyticsDayOfWeekCheckins } from "@blockwise/types";

const COLOR = "var(--brand-green)";

// Postgres extract(dow): 0 = Sunday .. 6 = Saturday.
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Single series (magnitude by day), so one hue and no legend, mirroring
// CheckinsOverTimeChart's color choice -- shows which days this venue is
// busiest, actionable for staffing/promo timing.
export function CheckinsByDayOfWeekChart({ data }: { data: VenueAnalyticsDayOfWeekCheckins[] }) {
  const rows = useMemo(() => {
    const counts = new Map(data.map((d) => [d.day_of_week, d.count]));
    return DAY_LABELS.map((label, dow) => ({ day: label, count: counts.get(dow) ?? 0 }));
  }, [data]);

  if (data.length === 0) {
    return <p className="text-sm text-muted">No check-ins in this window yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <XAxis
          dataKey="day"
          tick={{ fill: "var(--muted)", fontSize: 11 }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fill: "var(--muted)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={28}
        />
        <Tooltip
          cursor={{ fill: "var(--muted)", fillOpacity: 0.08 }}
          formatter={(value) => [Number(value ?? 0), "Check-ins"]}
          contentStyle={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            fontSize: 12,
          }}
          labelStyle={{ color: "var(--foreground)", fontWeight: 700 }}
          itemStyle={{ color: COLOR }}
        />
        <Bar dataKey="count" fill={COLOR} radius={[4, 4, 0, 0]} maxBarSize={32} />
      </BarChart>
    </ResponsiveContainer>
  );
}
