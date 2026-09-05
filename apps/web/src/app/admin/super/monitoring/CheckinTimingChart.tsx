"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { MonitoringCheckinTimingByDay, MonitoringCheckinTimingEntry } from "@blockwise/types";

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

// Individual view's per-attempt equivalent of PHASE_COLORS/PHASE_LABELS above
// -- same colors and copy (so a series means the same thing in either view),
// keyed by MonitoringCheckinTimingEntry's raw column names instead of the
// daily view's _avg_ms aggregate names.
const ENTRY_PHASE_COLORS: Record<"geofence_ms" | "rewards_ms" | "notify_ms" | "collection_ms", string> = {
  geofence_ms: PHASE_COLORS.geofence_avg_ms,
  rewards_ms: PHASE_COLORS.rewards_avg_ms,
  notify_ms: PHASE_COLORS.notify_avg_ms,
  collection_ms: PHASE_COLORS.collection_avg_ms,
};
const ENTRY_PHASE_LABELS: Record<keyof typeof ENTRY_PHASE_COLORS, string> = {
  geofence_ms: PHASE_LABELS.geofence_avg_ms,
  rewards_ms: PHASE_LABELS.rewards_avg_ms,
  notify_ms: PHASE_LABELS.notify_avg_ms,
  collection_ms: PHASE_LABELS.collection_avg_ms,
};

function formatDay(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatMoment(ms: number) {
  return new Date(ms).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

type Mode = "daily" | "individual";

// POST /locations/:id/checkins broken down by phase (checkin_timing_log,
// app.ts). Daily (checkin_timing_over_time) plots one point per day, each
// phase averaged across that day's attempts -- good for spotting a trend
// across a change, but it smooths away per-attempt variance. Individual
// (checkin_timing_recent, capped server-side at the 500 most recent attempts
// in the selected window) plots one point per attempt instead, for spotting
// outliers and real variance a daily average would hide. Total is every
// attempt's wall-clock time (comparable to the sibling API latency chart's
// own avg_ms), while the four phase series only ever have a value for
// outcome = "created" attempts, since a too_far/cooldown/not_found attempt
// never reaches the reward/notify/collection code. Today the phases run
// concurrently (BACKLOG.md Ref 116 item 3), so Total tracking below their sum
// is expected, not a bug.
export function CheckinTimingChart({
  daily,
  recent,
}: {
  daily: MonitoringCheckinTimingByDay[];
  recent: MonitoringCheckinTimingEntry[];
}) {
  const [mode, setMode] = useState<Mode>("daily");
  const data = mode === "daily" ? daily : recent;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2 self-start text-sm">
        {(["daily", "individual"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`rounded-full px-3 py-1.5 font-extrabold capitalize ${
              mode === m ? "bg-foreground text-on-accent" : "bg-card-alt text-muted"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {data.length === 0 ? (
        <p className="text-sm text-muted">No check-ins logged in this window yet.</p>
      ) : mode === "daily" ? (
        <DailyChart data={daily} />
      ) : (
        <IndividualChart data={recent} />
      )}
    </div>
  );
}

function DailyChart({ data }: { data: MonitoringCheckinTimingByDay[] }) {
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
          width={56}
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

function IndividualChart({ data }: { data: MonitoringCheckinTimingEntry[] }) {
  const points = data.map((entry) => ({ ...entry, x: new Date(entry.created_at).getTime() }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ScatterChart margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.6} />
        <XAxis
          dataKey="x"
          type="number"
          domain={["dataMin", "dataMax"]}
          tickFormatter={(value) => formatMoment(Number(value))}
          tick={{ fill: "var(--muted)", fontSize: 11 }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
          minTickGap={32}
        />
        <YAxis
          dataKey="total_ms"
          allowDecimals={false}
          tick={{ fill: "var(--muted)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={56}
          unit="ms"
        />
        <Tooltip
          cursor={{ stroke: "var(--border)" }}
          labelFormatter={(value) => formatMoment(Number(value))}
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
              {value === "total_ms" ? "Total" : ENTRY_PHASE_LABELS[value as keyof typeof ENTRY_PHASE_COLORS]}
            </span>
          )}
        />
        <Scatter name="total_ms" data={points} dataKey="total_ms" fill={TOTAL_COLOR} />
        {(Object.keys(ENTRY_PHASE_COLORS) as (keyof typeof ENTRY_PHASE_COLORS)[]).map((key) => (
          <Scatter
            key={key}
            name={key}
            data={points.filter((p) => p[key] !== null)}
            dataKey={key}
            fill={ENTRY_PHASE_COLORS[key]}
          />
        ))}
      </ScatterChart>
    </ResponsiveContainer>
  );
}
