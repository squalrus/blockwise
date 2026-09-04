import type { MonitoringStatusCodeBreakdown } from "@blockwise/types";

export type StatusCodeClass = MonitoringStatusCodeBreakdown["status_class"];

// Shared by StatusCodeBreakdownStats (tiles) and the Requests-over-time
// chart so a label/color/order can't drift out of sync between them --
// mirrors placesApiEndpoints.ts's role on the Geoapify page.
export const STATUS_CLASS_ORDER: StatusCodeClass[] = ["2xx", "3xx", "4xx", "5xx"];

export const STATUS_CLASS_LABELS: Record<StatusCodeClass, string> = {
  "2xx": "2xx OK",
  "3xx": "3xx Redirect",
  "4xx": "4xx Client error",
  "5xx": "5xx Server error",
};

// 2xx/5xx reuse the same green/orange "good/bad" hues as the rest of the
// dashboard (green also backs healthy avg latency, orange also backs the
// errors chart) so the signal reads consistently across sections.
export const STATUS_CLASS_COLORS: Record<StatusCodeClass, string> = {
  "2xx": "var(--brand-green)",
  "3xx": "var(--brand-purple)",
  "4xx": "var(--brand-amber)",
  "5xx": "var(--brand-orange)",
};
