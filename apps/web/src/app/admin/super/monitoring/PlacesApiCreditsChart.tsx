"use client";

import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { MonitoringPlacesApiCallByDayAndEndpoint } from "@blockwise/types";
import { PLACES_API_ENDPOINT_COLORS, PLACES_API_ENDPOINT_LABELS, PLACES_API_ENDPOINT_ORDER } from "./placesApiEndpoints";
import { pivotPlacesApiDailySeries } from "./placesApiChartData";

const TOTAL_COLOR = "var(--foreground)";
const TOTAL_LABEL = "Total";

function formatDay(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Credits-counterpart to PlacesApiCallsChart -- same self-instrumented
// source (places_api_call_log via InstrumentedPlacesClient) and same
// per-endpoint-line-plus-total shape, just plotting each row's already
// result-count-weighted `credits` (Postgres' places_api_call_credits(),
// 20260904020000_places_api_call_log_result_count.sql) instead of raw call
// count -- a day dominated by single-result searches and a day dominated by
// 100+-result bulk-sync tiles cost very different real Geoapify credit for
// the same call count, so this can't just reuse the calls chart's data.
export function PlacesApiCreditsChart({ data }: { data: MonitoringPlacesApiCallByDayAndEndpoint[] }) {
  const daily = pivotPlacesApiDailySeries(data, "credits");

  if (daily.length === 0) {
    return <p className="text-sm text-muted">No Places API calls in this window yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={daily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.6} />
        <XAxis
          dataKey="date"
          tickFormatter={formatDay}
          tick={{ fill: "var(--muted)", fontSize: 11 }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
          minTickGap={24}
        />
        <YAxis allowDecimals={false} tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} width={48} />
        <Tooltip
          formatter={(value, name) => [Number(value ?? 0).toLocaleString(), name]}
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
          formatter={(value) => <span style={{ color: "var(--muted-strong)" }}>{value}</span>}
        />
        <Area
          type="monotone"
          dataKey="total"
          name={TOTAL_LABEL}
          stroke={TOTAL_COLOR}
          strokeWidth={2}
          fill={TOTAL_COLOR}
          fillOpacity={0.08}
        />
        {PLACES_API_ENDPOINT_ORDER.map((endpoint) => (
          <Line
            key={endpoint}
            type="monotone"
            dataKey={endpoint}
            name={PLACES_API_ENDPOINT_LABELS[endpoint]}
            stroke={PLACES_API_ENDPOINT_COLORS[endpoint]}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
