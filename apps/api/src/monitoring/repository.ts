import type { MonitoringAnalytics, MonitoringPlacesApiDayToDate, PlacesApiEndpoint } from "@blockwise/types";

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
  endpoint: PlacesApiEndpoint;
  success: boolean;
  durationMs: number;
  errorMessage?: string | null;
  // Short, endpoint-specific description of what was actually requested
  // (e.g. "placeId: 51d5f2d1..." for getPlaceDetails, `text: "..."` for
  // searchText) -- InstrumentedPlacesClient builds this per call, so a
  // failure like "Invalid Place ID" is traceable back to which place ID
  // without needing to correlate against another table.
  requestContext: string;
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
  // Today's (UTC) successful call count per endpoint, across all endpoints --
  // backs PlacesApiQuotaGuard (see apps/api/src/places/quotaGuard.ts), which
  // weights each endpoint's count by its credit cost and checks the total
  // against Geoapify's shared daily free-credit pool before a non-critical
  // getPlaceDetails call, to decide whether that pool is at/near its limit.
  // Deliberately a narrow direct query rather than reusing getAnalytics --
  // this runs on ordinary visitor page loads (via the quota guard's short
  // cache), not just the super-admin Monitoring tab.
  getDayToDateCallCounts(): Promise<MonitoringPlacesApiDayToDate[]>;
  // domain narrows every chart to one deployment's rows (e.g.
  // "app.tryspored.com"); version narrows to one shipped release (e.g.
  // "0.81.0"); statusClass narrows recent_requests to one status-code family
  // (e.g. "4xx") -- undefined/null keeps today's "everything" behavior for
  // any of the three.
  getAnalytics(
    minutes: number,
    domain?: string | null,
    version?: string | null,
    statusClass?: string | null
  ): Promise<MonitoringAnalytics>;
}
