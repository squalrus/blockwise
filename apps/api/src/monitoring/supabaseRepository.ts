import type { SupabaseClient } from "@supabase/supabase-js";
import type { MonitoringAnalytics, MonitoringSlowQuery, PlacesApiEndpoint } from "@blockwise/types";
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
    });

    if (error) throw new Error(`logPlacesApiCall failed: ${error.message}`);
  }

  // Delegates the "start of this month" boundary to the DB (RPC
  // get_places_api_month_to_date_count / google_places_billing_month_start,
  // 20260825140000_places_api_billing_month_pacific_time.sql) rather than
  // computing it here -- Google's free tier resets at midnight *Pacific
  // Time*, not UTC, and Pacific Time's PST/PDT offset changes twice a year,
  // which JS date math would have to special-case. Postgres's `at time
  // zone 'America/Los_Angeles'` already handles that correctly.
  async getMonthToDateCallCount(endpoint: PlacesApiEndpoint): Promise<number> {
    const { data, error } = await this.supabase.rpc("get_places_api_month_to_date_count", {
      p_endpoint: endpoint,
    });

    if (error) throw new Error(`getMonthToDateCallCount failed: ${error.message}`);
    return data ?? 0;
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
