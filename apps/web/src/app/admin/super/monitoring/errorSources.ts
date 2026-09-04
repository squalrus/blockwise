import type { MonitoringErrorsBySource } from "@blockwise/types";

export type ErrorLogSource = MonitoringErrorsBySource["source"];

// Shared by ErrorsBySourceStats (tiles) and ErrorsOverTimeChart (per-source
// trend lines) so a label/color/order can't drift out of sync between them
// -- mirrors placesApiEndpoints.ts's role on the Geoapify page.
export const ERROR_LOG_SOURCE_ORDER: ErrorLogSource[] = ["web", "api", "marketing"];

export const ERROR_LOG_SOURCE_LABELS: Record<ErrorLogSource, string> = {
  api: "API errors",
  web: "App errors",
  marketing: "Marketing errors",
};

export const ERROR_LOG_SOURCE_COLORS: Record<ErrorLogSource, string> = {
  api: "var(--brand-orange)",
  web: "var(--brand-purple)",
  marketing: "var(--brand-amber)",
};
