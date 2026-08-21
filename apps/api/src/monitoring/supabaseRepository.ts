import type { SupabaseClient } from "@supabase/supabase-js";
import type { MonitoringAnalytics, MonitoringSlowQuery } from "@blockwise/types";
import type { ErrorLogEntry, MonitoringRepository, PlacesApiCallEntry, RequestLogEntry } from "./repository";

export class SupabaseMonitoringRepository implements MonitoringRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async logError(entry: ErrorLogEntry): Promise<void> {
    const { error } = await this.supabase.from("error_log").insert({
      source: entry.source,
      message: entry.message,
      stack: entry.stack ?? null,
      context: entry.context ?? null,
    });

    if (error) throw new Error(`logError failed: ${error.message}`);
  }

  async logRequest(entry: RequestLogEntry): Promise<void> {
    const { error } = await this.supabase.from("request_log").insert({
      method: entry.method,
      path: entry.path,
      status_code: entry.statusCode,
      duration_ms: entry.durationMs,
    });

    if (error) throw new Error(`logRequest failed: ${error.message}`);
  }

  async logPlacesApiCall(entry: PlacesApiCallEntry): Promise<void> {
    const { error } = await this.supabase.from("places_api_call_log").insert({
      endpoint: entry.endpoint,
      success: entry.success,
      duration_ms: entry.durationMs,
    });

    if (error) throw new Error(`logPlacesApiCall failed: ${error.message}`);
  }

  // Two RPCs, not one -- get_slow_queries reads pg_stat_statements, which
  // needs its own security-definer function distinct from
  // get_monitoring_analytics's ordinary invoker rights (see
  // 20260821060000_pg_stat_statements.sql). Fetched in parallel and merged
  // here so callers still see one method, one MonitoringAnalytics shape.
  async getAnalytics(days: number): Promise<MonitoringAnalytics> {
    const [analyticsResult, slowQueriesResult] = await Promise.all([
      this.supabase.rpc("get_monitoring_analytics", { p_days: days }),
      this.supabase.rpc("get_slow_queries", { p_limit: 10 }),
    ]);

    if (analyticsResult.error) throw new Error(`getAnalytics failed: ${analyticsResult.error.message}`);
    if (slowQueriesResult.error) throw new Error(`getAnalytics (slow queries) failed: ${slowQueriesResult.error.message}`);

    const analytics = analyticsResult.data as MonitoringAnalytics;
    const slowestQueries = (slowQueriesResult.data ?? []) as MonitoringSlowQuery[];
    return { ...analytics, slowest_queries: slowestQueries };
  }
}
