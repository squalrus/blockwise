"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { MonitoringCheckinTimingByDay } from "@blockwise/types";

const TOTAL_COLOR = "var(--foreground)";
const PHASE_COLORS: Record<"geofence_avg_ms" | "rewards_avg_ms" | "notify_avg_ms" | "collection_avg_ms", string> = {
  geofence_avg_ms: "var(--brand-green)",
  rewards_avg_ms: "var(--brand-amber)",
  notify_avg_ms: "var(--brand-purple)",
  collection_avg_ms: "var(--brand-orange)",
};
const PHASE_LABELS: Record<keyof typeof PHASE_COLORS, string> = {
  geofence_avg_ms: "Geofence/cooldown",
  rewards_avg_ms: "Rewards",
  notify_avg_ms: "Notify connections",
  collection_avg_ms: "Collection",
};

function formatDay(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// POST /locations/:id/checkins broken down by phase (checkin_timing_log,
// app.ts) -- Total is every attempt's wall-clock time (comparable to the
// sibling API latency chart's own avg_ms), while the four phase lines only
// reflect outcome = "created" attempts, since a too_far/cooldown/not_found
// attempt never reaches the reward/notify/collection code. Today the phases
// run one after another, so they roughly sum to Total; once any of them are
// parallelized, Total dropping below that sum is the signal the change
// actually overlapped their latency instead of just moving it around.
export function CheckinTimingChart({ data }: { data: MonitoringCheckinTimingByDay[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted">No check-ins logged in this window yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.6} />
        <XAxis
          dataKey="date"
          tickFormatter={formatDay}
          tick={{ fill: "var(--muted)", fontSize: 11 }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
          minTickGap={24}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fill: "var(--muted)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={40}
          unit="ms"
        />
        <Tooltip
          labelFormatter={(label) => formatDay(String(label ?? ""))}
          contentStyle={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            fontSize: 12,
          }}
          labelStyle={{ color: "var(--foreground)", fontWeight: 700 }}
        />
        <Legend
          wrapperStyle={{ fontSize: 11, fontWeight: 700 }}
          formatter={(value) => (
            <span style={{ color: "var(--muted-strong)" }}>
              {value === "total_avg_ms" ? "Total" : PHASE_LABELS[value as keyof typeof PHASE_COLORS]}
            </span>
          )}
        />
        <Line type="monotone" dataKey="total_avg_ms" name="total_avg_ms" stroke={TOTAL_COLOR} strokeWidth={2} dot={false} />
        {(Object.keys(PHASE_COLORS) as (keyof typeof PHASE_COLORS)[]).map((key) => (
          <Line key={key} type="monotone" dataKey={key} name={key} stroke={PHASE_COLORS[key]} strokeWidth={2} dot={false} connectNulls />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
