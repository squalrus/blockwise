import type { ReportClientErrorRequest } from "@blockwise/types";
import { clientApiUrl } from "./clientApi";

// Marketing's counterpart to apps/web's lib/reportClientError.ts -- same
// fire-and-forget shape, tagged with source: "marketing" so the Monitoring
// tab can tell the two apart. Shared by ClientErrorReporter (window.onerror/
// unhandledrejection) and the error.tsx/global-error.tsx boundaries.
export function reportClientError(message: string, stack?: string, context?: Record<string, unknown>): void {
  const body: ReportClientErrorRequest = { message, stack, context, source: "marketing" };
  try {
    fetch(clientApiUrl("/monitoring/client-errors"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Best-effort only.
  }
}
