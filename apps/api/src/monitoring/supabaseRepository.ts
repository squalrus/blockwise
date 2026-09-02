import type { SupabaseClient } from "@supabase/supabase-js";
import type { MonitoringAnalytics, MonitoringPlacesApiDayToDate, MonitoringSlowQuery } from "@blockwise/types";
import { getAppDomain } from "./appDomain";
import { getAppVersion } from "./appVersion";
import type { ErrorLogEntry, MonitoringRepository, PlacesApiCallEntry, RequestLogEntry } from "./repository";

export class SupabaseMonitoringRepository implements MonitoringRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async logError(entry: ErrorLogEntry): Promise<void> {
    const { error } = await this.supabase.from("error_log").insert({
      source: entry.source,
      message: entry.message,
      stack: entry.stack ?? null,
      context: entry.context ?? null,
      domain: getAppDomain(),
      app_version: getAppVersion(),
    });

    if (error) throw new Error(`logError failed: ${error.message}`);
  }

  async logRequest(entry: RequestLogEntry): Promise<void> {
    const { error } = await this.supabase.from("request_log").insert({
      method: entry.method,
      path: entry.path,
      status_code: entry.statusCode,
      duration_ms: entry.durationMs,
      domain: getAppDomain(),
      app_version: getAppVersion(),
    });

    if (error) throw new Error(`logRequest failed: ${error.message}`);
  }

  async logPlacesApiCall(entry: PlacesApiCallEntry): Promise<void> {
    const { error } = await this.supabase.from("places_api_call_log").insert({
      endpoint: entry.endpoint,
      success: entry.success,
      duration_ms: entry.durationMs,
      error_message: entry.errorMessage ?? null,
      request_context: entry.requestContext,
      domain: getAppDomain(),
      app_version: getAppVersion(),
    });

    if (error) throw new Error(`logPlacesApiCall failed: ${error.message}`);
  }

  // Delegates the "start of today" boundary to the DB (RPC
  // get_places_api_day_to_date_counts / geoapify_billing_day_start,
  // 20260902010000_geoapify_credit_metering.sql) so the boundary logic
  // lives in exactly one place, shared with get_monitoring_analytics's
  // places_api_day_to_date_by_endpoint. Returns every endpoint's count in
  // one call (not one endpoint at a time) so PlacesApiQuotaGuard can weight
  // and sum them into a total against Geoapify's shared daily credit pool.
  async getDayToDateCallCounts(): Promise<MonitoringPlacesApiDayToDate[]> {
    const { data, error } = await this.supabase.rpc("get_places_api_day_to_date_counts");

    if (error) throw new Error(`getDayToDateCallCounts failed: ${error.message}`);
    return (data ?? []) as MonitoringPlacesApiDayToDate[];
  }

  // Two RPCs, not one -- get_slow_queries reads pg_stat_statements, which
  // needs its own security-definer function distinct from
  // get_monitoring_analytics's ordinary invoker rights (see
  // 20260821060000_pg_stat_statements.sql). Fetched in parallel and merged
  // here so callers still see one method, one MonitoringAnalytics shape.
  async getAnalytics(
    days: number,
    domain?: string | null,
    version?: string | null,
    statusClass?: string | null
  ): Promise<MonitoringAnalytics> {
    const [analyticsResult, slowQueriesResult] = await Promise.all([
      this.supabase.rpc("get_monitoring_analytics", {
        p_days: days,
        p_domain: domain ?? null,
        p_version: version ?? null,
        p_status_class: statusClass ?? null,
      }),
      this.supabase.rpc("get_slow_queries", { p_limit: 10 }),
    ]);

    if (analyticsResult.error) throw new Error(`getAnalytics failed: ${analyticsResult.error.message}`);
    if (slowQueriesResult.error) throw new Error(`getAnalytics (slow queries) failed: ${slowQueriesResult.error.message}`);

    const analytics = analyticsResult.data as MonitoringAnalytics;
    const slowestQueries = (slowQueriesResult.data ?? []) as MonitoringSlowQuery[];
    return { ...analytics, slowest_queries: slowestQueries };
  }
}
