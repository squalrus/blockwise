"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/reportClientError";

// Next.js only mounts this when the root layout itself throws (BACKLOG.md
// Ref 104) -- it replaces <html>/<body> entirely, so unlike error.tsx it
// can't rely on globals.css/font variables or @blockwise/ui components being
// available; kept deliberately plain.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportClientError(error.message, error.stack, {
      url: window.location.href,
      digest: error.digest,
      global: true,
    });
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: "sans-serif", textAlign: "center", padding: "4rem 1rem" }}>
        <h1>Something went wrong</h1>
        <p>An unexpected error occurred. Please try again.</p>
        <button type="button" onClick={reset}>
          Try again
        </button>
      </body>
    </html>
  );
}
