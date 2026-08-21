import type { MonitoringAnalytics } from "@blockwise/types";

export interface ErrorLogEntry {
  source: "api" | "web";
  message: string;
  stack?: string | null;
  context?: Record<string, unknown> | null;
}

export interface RequestLogEntry {
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
}

// Backs the super-admin Monitoring tab (BACKLOG.md Ref 104) -- both writers
// (installErrorLogging's wrapped console.error/process handlers, and the
// request-logging middleware in app.ts) and the one reader (the Monitoring
// tab's analytics RPC) go through this interface, mirroring every other
// domain's repository split.
export interface MonitoringRepository {
  logError(entry: ErrorLogEntry): Promise<void>;
  logRequest(entry: RequestLogEntry): Promise<void>;
  getAnalytics(days: number): Promise<MonitoringAnalytics>;
}
