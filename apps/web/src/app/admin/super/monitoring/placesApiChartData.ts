import type { MonitoringPlacesApiCallByDayAndEndpoint, PlacesApiEndpoint } from "@blockwise/types";

export type PlacesApiDailySeriesPoint = { date: string; total: number } & Record<PlacesApiEndpoint, number>;

// Pivots the flat (date, endpoint, count, credits) rows from
// places_api_calls_by_day_and_endpoint into one row per date with each
// endpoint as its own column plus a `total` column -- the shape recharts
// needs to overlay every endpoint's line (and the total) on one chart.
// Shared by PlacesApiCallsChart (valueKey "count") and PlacesApiCreditsChart
// (valueKey "credits") so the two charts pivot identically and can't drift
// apart from each other.
export function pivotPlacesApiDailySeries(
  data: MonitoringPlacesApiCallByDayAndEndpoint[],
  valueKey: "count" | "credits"
): PlacesApiDailySeriesPoint[] {
  const byDate = new Map<string, PlacesApiDailySeriesPoint>();
  for (const row of data) {
    let point = byDate.get(row.date);
    if (!point) {
      point = { date: row.date, total: 0, searchPlaces: 0, searchText: 0, reverseGeocode: 0, getPlaceDetails: 0 };
      byDate.set(row.date, point);
    }
    const value = row[valueKey];
    point[row.endpoint] += value;
    point.total += value;
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}
