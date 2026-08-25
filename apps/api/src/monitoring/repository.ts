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

export interface PlacesApiCallEntry {
  endpoint: "searchNearby" | "searchText" | "getPlaceDetails" | "fetchPhotoMedia";
  success: boolean;
  durationMs: number;
  errorMessage?: string | null;
}

// Backs the super-admin Monitoring tab (BACKLOG.md Ref 104) -- writers
// (installErrorLogging's wrapped console.error/process handlers, the
// request-logging middleware in app.ts, and InstrumentedPlacesClient) and
// the one reader (the Monitoring tab's analytics RPCs) go through this
// interface, mirroring every other domain's repository split.
export interface MonitoringRepository {
  logError(entry: ErrorLogEntry): Promise<void>;
  logRequest(entry: RequestLogEntry): Promise<void>;
  logPlacesApiCall(entry: PlacesApiCallEntry): Promise<void>;
  // domain narrows every chart to one deployment's rows (e.g.
  // "app.tryspored.com"); version narrows to one shipped release (e.g.
  // "0.81.0"); statusClass narrows recent_requests to one status-code family
  // (e.g. "4xx") -- undefined/null keeps today's "everything" behavior for
  // any of the three.
  getAnalytics(
    days: number,
    domain?: string | null,
    version?: string | null,
    statusClass?: string | null
  ): Promise<MonitoringAnalytics>;
}
