"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { MonitoringPlacesApiCallByDayAndEndpoint } from "@blockwise/types";
import { estimateCredits } from "./placesApiCredits";

const COLOR = "var(--brand-amber)";

function formatDay(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Sums count * weight across endpoints per day -- can't reuse
// places_api_calls_over_time's plain daily total for this since each
// endpoint has its own per-request credit cost (PLACES_API_CREDIT_COST); a
// day dominated by cheap single-result searches and a day dominated by
// pricier bulk ones would otherwise show as the same "credits" for the same
// call count (once Geoapify's extra-results bonus is modeled -- today every
// endpoint is a flat 1 credit/request, see PLACES_API_CREDIT_COST's comment).
function toDailyCredits(data: MonitoringPlacesApiCallByDayAndEndpoint[]): { date: string; credits: number }[] {
  const byDate = new Map<string, number>();
  for (const row of data) {
    byDate.set(row.date, (byDate.get(row.date) ?? 0) + estimateCredits(row.count, row.endpoint));
  }
  return [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, credits]) => ({ date, credits }));
}

// Credits-counterpart to PlacesApiCallsChart -- same self-instrumented
// source (places_api_call_log via InstrumentedPlacesClient), same caveat
// (a lower-bound estimate, not Geoapify's exact metering; see
// PLACES_API_CREDIT_COST).
export function PlacesApiCreditsChart({ data }: { data: MonitoringPlacesApiCallByDayAndEndpoint[] }) {
  const daily = toDailyCredits(data);

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
          allowDecimals={false}
          tick={{ fill: "var(--muted)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={48}
        />
        <Tooltip
          formatter={(value) => [Number(value ?? 0).toLocaleString(), "Credits"]}
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
        <Area type="monotone" dataKey="credits" stroke={COLOR} strokeWidth={2} fill={COLOR} fillOpacity={0.1} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
