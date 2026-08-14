"use client";

import { useEffect } from "react";

// Registers public/service-worker.js on every page load (BACKLOG.md Ref 89)
// -- needed for both installability and to receive Web Push. Renders
// nothing; failures (unsupported browser, blocked by an extension) are
// swallowed since there's no UI here to surface them to.
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/service-worker.js").catch(() => {});
  }, []);

  return null;
}
