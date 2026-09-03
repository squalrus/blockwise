"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/reportClientError";

// Mirrors apps/web's ClientErrorReporter.tsx -- catches uncaught JS errors
// and unhandled promise rejections that happen outside React's render/
// lifecycle. Render crashes are covered separately by error.tsx/
// global-error.tsx. Mounted once in the root layout, renders nothing.
export function ClientErrorReporter() {
  useEffect(() => {
    function onError(event: ErrorEvent) {
      reportClientError(event.message, event.error?.stack, { url: window.location.href });
    }

    function onRejection(event: PromiseRejectionEvent) {
      const reason = event.reason;
      const message = reason instanceof Error ? reason.message : String(reason);
      const stack = reason instanceof Error ? reason.stack : undefined;
      reportClientError(message, stack, { url: window.location.href, kind: "unhandledrejection" });
    }

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
