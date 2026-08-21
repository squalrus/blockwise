import type { ReportClientErrorRequest } from "@blockwise/types";
import { clientApiUrl } from "./clientApi";

// Shared by ClientErrorReporter (window.onerror/unhandledrejection) and the
// error.tsx/global-error.tsx boundaries (BACKLOG.md Ref 104) -- fire-and-
// forget, never lets a failed report block the UI. `keepalive` lets the
// request survive a page unload triggered by the same error.
export function reportClientError(message: string, stack?: string, context?: Record<string, unknown>): void {
  const body: ReportClientErrorRequest = { message, stack, context };
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
