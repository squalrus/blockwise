"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { MonitoringPlacesApiCallByDayAndEndpoint } from "@blockwise/types";
import { estimateCost, formatUsd } from "./placesApiCost";

const COLOR = "var(--brand-amber)";

function formatDay(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Sums count * rate across endpoints per day -- can't reuse
// places_api_calls_over_time's plain daily total for this since each
// endpoint bills at a different rate (PLACES_API_PRICING); a day dominated
// by cheap photo fetches and a day dominated by pricier searches would
// otherwise show as the same "cost" for the same call count.
function toDailyCost(data: MonitoringPlacesApiCallByDayAndEndpoint[]): { date: string; cost: number }[] {
  const byDate = new Map<string, number>();
  for (const row of data) {
    byDate.set(row.date, (byDate.get(row.date) ?? 0) + estimateCost(row.count, row.endpoint));
  }
  return [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, cost]) => ({ date, cost }));
}

// Estimated-cost counterpart to PlacesApiCallsChart -- same self-instrumented
// source (places_api_call_log via InstrumentedPlacesClient), same caveat
// (upper-bound estimate, not GCP's actual bill; see PLACES_API_PRICING).
export function PlacesApiCostChart({ data }: { data: MonitoringPlacesApiCallByDayAndEndpoint[] }) {
  const daily = toDailyCost(data);

  if (daily.length === 0) {
    return <p className="text-sm text-muted">No Places API calls in this window yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={daily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
          tickFormatter={(value) => formatUsd(Number(value ?? 0))}
          tick={{ fill: "var(--muted)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={56}
        />
        <Tooltip
          formatter={(value) => [formatUsd(Number(value ?? 0)), "Est. cost"]}
          labelFormatter={(label) => formatDay(String(label ?? ""))}
          contentStyle={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            fontSize: 12,
          }}
          labelStyle={{ color: "var(--foreground)", fontWeight: 700 }}
          itemStyle={{ color: COLOR }}
        />
        <Area type="monotone" dataKey="cost" stroke={COLOR} strokeWidth={2} fill={COLOR} fillOpacity={0.1} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
