"use client";

import { useEffect } from "react";
import Link from "next/link";
import { MushroomLogo } from "@blockwise/ui";
import { reportClientError } from "@/lib/reportClientError";

// React error boundary (Next.js App Router convention) for a render crash
// anywhere under the root layout -- mirrors apps/web's error.tsx, styled
// with marketing's fixed hex palette (see not-found.tsx) instead of the
// app's CSS-variable tokens.
const INK = "#2B1B12";
const CREAM = "#FBF2E4";
const ORANGE = "#E8542A";
const MUTED = "#8A7761";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportClientError(error.message, error.stack, { url: window.location.href, digest: error.digest });
  }, [error]);

  return (
    <div
      className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center gap-5 p-4 text-center font-sans sm:p-16"
      style={{ background: CREAM }}
    >
      <MushroomLogo size={64} capColor={ORANGE} />
      <h1 className="font-heading text-2xl font-extrabold" style={{ color: INK }}>
        Something went wrong
      </h1>
      <p className="text-sm" style={{ color: MUTED }}>
        An unexpected error occurred. You can try again, or head back home.
      </p>
      <div className="mt-1 flex gap-2">
        <button
          type="button"
          onClick={reset}
          className="rounded-full border px-4 py-2 text-sm font-extrabold"
          style={{ borderColor: MUTED, color: INK }}
        >
          Try again
        </button>
        <Link href="/" className="rounded-full px-4 py-2 text-sm font-extrabold" style={{ background: ORANGE, color: CREAM }}>
          Back to home
        </Link>
      </div>
    </div>
  );
}
