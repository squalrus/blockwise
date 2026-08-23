"use client";

import { useState } from "react";
import { CollectionCard } from "../../../account/(tabs)/collection/page";
import { CollectionDetailModal } from "../../../account/(tabs)/collection/CollectionDetailModal";
import { COLLECTION_ENTRIES } from "../demoData";

const ENTRIES = COLLECTION_ENTRIES.map(({ entry }) => entry);

export default function CollectionCardDemoPage() {
  const [detailIndex, setDetailIndex] = useState<number | null>(null);

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground">Collection card</h1>
        <p className="mt-1 text-sm text-muted">
          CollectionCard, as rendered on /account&apos;s collection tab. Click a card to preview
          CollectionDetailModal&apos;s matching treatment.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-5">
        {COLLECTION_ENTRIES.map(({ label, entry }, index) => (
          <div key={entry.id} className="flex flex-col gap-2">
            <p className="text-[11px] font-extrabold tracking-wide text-muted uppercase">{label}</p>
            <button type="button" onClick={() => setDetailIndex(index)} className="w-full text-left">
              <CollectionCard entry={entry} />
            </button>
          </div>
        ))}
      </div>

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
