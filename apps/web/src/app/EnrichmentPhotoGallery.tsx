"use client";

import { useState } from "react";

// Split out of EnrichmentSection.tsx (a Server Component -- LocationAboutPage
// passes it a `photoUrl` function prop, which can't cross into a Client
// Component) so only this interactive strip needs "use client".
//
// Hides individual photos that fail to load, collapsing to nothing (not a
// placeholder box -- an empty gray strip read as broken, not "no photos")
// once every one of them fails. That most commonly happens all at once, not
// one photo at a time: the cost guardrail (apps/api/src/places/
// quotaGuard.ts) skips fetchPhotoMedia for the rest of the billing month
// once triggered, which 404s every photo on every venue simultaneously, not
// just this one -- so letting each <img>'s onError remove itself, with no
// separate guardrail-aware check, already produces the right outcome: the
// whole strip disappears once every image in it has failed.
export function EnrichmentPhotoGallery({ photoUrls, alt }: { photoUrls: string[]; alt: string }) {
  const [failedIndices, setFailedIndices] = useState<ReadonlySet<number>>(new Set());

  const visible = photoUrls.map((url, index) => ({ url, index })).filter(({ index }) => !failedIndices.has(index));

  if (visible.length === 0) {
    return null;
  }

  return (
    <div className="flex gap-2 overflow-x-auto">
      {visible.map(({ url, index }) => (
        // eslint-disable-next-line @next/next/no-img-element -- proxied through apps/api, not a static asset
        <img
          key={index}
          src={url}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setFailedIndices((prev) => new Set(prev).add(index))}
          className="h-32 w-56 flex-none rounded-2xl object-cover"
        />
      ))}
    </div>
  );
}
