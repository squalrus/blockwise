"use client";

import { useState } from "react";
import { CollectionCard } from "../../../../account/(tabs)/collection/page";
import { CollectionDetailModal } from "../../../../account/(tabs)/collection/CollectionDetailModal";
import { COLLECTION_ENTRIES } from "../demoData";

const ENTRIES = COLLECTION_ENTRIES.map(({ entry }) => entry);

// Grouped by style (business/POI/neighborhood/connection/legacy) for
// rendering -- COLLECTION_ENTRIES is already ordered style-by-style, so a
// simple run-length grouping (rather than a Map) preserves that order and
// keeps each group's flat-array index (used for the detail modal's
// prev/next) equal to its position in ENTRIES above.
const GROUPS: { style: string; items: { label: string; entry: (typeof COLLECTION_ENTRIES)[number]["entry"]; index: number }[] }[] = [];
COLLECTION_ENTRIES.forEach(({ style, label, entry }, index) => {
  const group = GROUPS.at(-1);
  if (group && group.style === style) {
    group.items.push({ label, entry, index });
  } else {
    GROUPS.push({ style, items: [{ label, entry, index }] });
  }
});

export default function CollectionCardDemoPage() {
  const [detailIndex, setDetailIndex] = useState<number | null>(null);

  return (
    <section className="flex flex-col gap-8">
      <div>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground">Collection card</h1>
        <p className="mt-1 text-sm text-muted">
          CollectionCard, as rendered on /account&apos;s collection tab. Click a card to preview
          CollectionDetailModal&apos;s matching treatment. Three variants per style -- quantity (no badge / small
          badge / double-digit badge) and source-name length.
        </p>
      </div>

      {GROUPS.map((group) => (
        <div key={group.style} className="flex flex-col gap-2.5">
          <h2 className="text-[11px] font-extrabold tracking-wide text-muted uppercase">{group.style}</h2>
          <div className="grid grid-cols-3 gap-4 sm:max-w-md">
            {group.items.map(({ label, entry, index }) => (
              <div key={entry.id} className="flex flex-col gap-2">
                <p className="text-[10px] text-muted">{label}</p>
                <button type="button" onClick={() => setDetailIndex(index)} className="w-full text-left">
                  <CollectionCard entry={entry} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {detailIndex !== null && (
        <CollectionDetailModal
          entries={ENTRIES}
          index={detailIndex}
          onClose={() => setDetailIndex(null)}
          onNavigate={setDetailIndex}
        />
      )}
    </section>
  );
}
