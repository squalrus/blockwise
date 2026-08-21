"use client";

import { useEffect, useState } from "react";

const DISMISSED_KEY = "blockwise_install_dismissed";

// Chrome only fires this on the window, and only when its own installability
// heuristics are met (manifest + service worker registered) -- there's no
// way to trigger the native banner on demand, only to capture and replay it
// from a custom CTA (Chrome stopped auto-showing its own banner some time
// ago, hence needing this at all).
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari's own (non-standard) flag -- matchMedia alone doesn't
    // reliably report standalone there.
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
}

// Android/Chrome: capture beforeinstallprompt and show a custom CTA. iOS:
// no beforeinstallprompt exists at all there, so this shows a "how to"
// banner for the manual Share -> Add to Home Screen flow instead
// (BACKLOG.md Ref 89).
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosBanner, setShowIosBanner] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    // dismissed/showIosBanner start out hiding the banner so the first
    // client render matches the server-rendered markup -- these only flip
    // after mount, once localStorage/standalone-mode (both browser-only)
    // have actually been checked.
    if (isStandalone()) return;
    if (localStorage.getItem(DISMISSED_KEY) === "1") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- deliberately deferred past hydration, see comment above
    setDismissed(false);

    if (isIos()) {
      setShowIosBanner(true);
      return;
    }

    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
  }

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    dismiss();
  }

  if (dismissed || (!deferredPrompt && !showIosBanner)) return null;

  return (
    <div className="flex items-center justify-between gap-3 bg-brand-purple px-4 py-2.5 text-sm text-on-accent">
      {showIosBanner ? (
        <span>
          Install Spored: tap <span className="font-bold">Share</span>, then{" "}
          <span className="font-bold">Add to Home Screen</span>.
        </span>
      ) : (
        <span className="font-bold">Install Spored for quick access and notifications.</span>
      )}
      <div className="flex shrink-0 items-center gap-3">
        {deferredPrompt && (
          <button
            type="button"
            onClick={install}
            className="rounded-full bg-on-accent px-3 py-1 text-xs font-bold text-brand-purple"
          >
            Install
          </button>
        )}
        <button type="button" onClick={dismiss} aria-label="Dismiss" className="text-on-accent/80 hover:text-on-accent">
          ✕
        </button>
      </div>
    </div>
  );
}
