import type { SupabaseClient } from "@supabase/supabase-js";
import type { MonitoringAnalytics } from "@blockwise/types";
import type { ErrorLogEntry, MonitoringRepository, RequestLogEntry } from "./repository";

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

  async getAnalytics(days: number): Promise<MonitoringAnalytics> {
    const { data, error } = await this.supabase.rpc("get_monitoring_analytics", { p_days: days });

    if (error) throw new Error(`getAnalytics failed: ${error.message}`);
    return data as MonitoringAnalytics;
  }
}
