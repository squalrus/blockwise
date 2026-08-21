"use client";

import { useEffect } from "react";
import Link from "next/link";
import { MushroomLogo } from "@blockwise/ui";
import { reportClientError } from "@/lib/reportClientError";

// React error boundary (Next.js App Router convention, BACKLOG.md Ref 104)
// for a render crash anywhere under the root layout -- mirrors not-found.tsx's
// on-brand styling.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportClientError(error.message, error.stack, { url: window.location.href, digest: error.digest });
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-5 p-4 text-center font-sans sm:p-16">
      <MushroomLogo size={64} capColor="var(--brand-orange)" />
      <h1 className="font-heading text-2xl font-extrabold">Something went wrong</h1>
      <p className="text-sm text-muted">
        An unexpected error occurred. You can try again, or head back home.
      </p>
      <div className="mt-1 flex gap-2">
        <button
          type="button"
          onClick={reset}
          className="rounded-full border-1.5 border-border bg-card px-4 py-2 text-sm font-extrabold text-muted-strong"
        >
          Try again
        </button>
        <Link href="/" className="rounded-full bg-brand-orange px-4 py-2 text-sm font-extrabold text-on-accent">
          Back to home
        </Link>
      </div>
    </div>
  );
}
