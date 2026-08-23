"use client";

import { useEffect, useState } from "react";
import type { MushroomCollectionEntry } from "@blockwise/types";
import { MushroomLoader, MushroomMark, mushroomOutline } from "@blockwise/ui";
import { getAccessToken } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";
import { useAccountRefresh } from "../../AccountContext";
import { CardTypeMark } from "./CardTypeMark";
import { CollectionDetailModal } from "./CollectionDetailModal";
import { CornerMark } from "./CornerMark";
import { CARD_BORDER_CLASS, cardKindForEntry } from "./entityKind";
import { sourceLabel } from "./sourceLabel";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; entries: MushroomCollectionEntry[] };

async function load(setState: (state: State) => void) {
  const token = await getAccessToken();
  const headers = { Authorization: `Bearer ${token}` };
  const res = await fetch(clientApiUrl("/me/collection"), { headers });

  if (!res.ok) {
    setState({ status: "error", message: "Failed to load your collection" });
    return;
  }

  setState({ status: "ready", entries: await res.json() });
}

// The revealed-species "card front" -- shared by an already-revealed grid
// tile (rendered plain) and CollectionTile's flip back face (which wraps
// this in its own rotateY(180deg), see below). Laid out like a playing
// card: a top-left corner mark, a qty pill, the mark centered in a soft
// circle, name/source pinned at the bottom. Deliberately no bottom-right
// corner mark (dropped along with CornerMark's own `rotated` mirror) -- a
// long source name sitting just above that corner collided with it.
export function CollectionCard({ entry }: { entry: MushroomCollectionEntry }) {
  const kind = cardKindForEntry(entry);
  return (
    <div className="relative flex aspect-[5/7] w-full flex-col items-center justify-between overflow-hidden rounded-2xl border border-border bg-card px-2.5 py-3.5 shadow-sm">
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-1.5 rounded-lg border-[1.5px] ${kind ? CARD_BORDER_CLASS[kind] : "border-foreground/10"}`}
      />
      {kind ? (
        <CardTypeMark kind={kind} />
      ) : (
        <CornerMark initial={entry.species_name.charAt(0)} shape={entry.mushroom.shape} />
      )}
      {entry.quantity > 1 && (
        <span className="absolute top-3.5 right-3.5 rounded-full bg-brand-orange px-1.5 py-0.5 text-[10px] font-extrabold text-on-accent">
          {entry.quantity}x
        </span>
      )}
      <span className="relative flex flex-1 items-center justify-center">
        <span className="flex h-21 w-21 items-center justify-center rounded-full bg-background/60">
          <MushroomMark {...entry.mushroom} size={64} outline />
        </span>
      </span>
      <span className="relative flex max-w-full flex-col items-center gap-0.5 text-center">
        <span className="line-clamp-1 font-heading text-[13px] leading-tight font-extrabold text-foreground">
          {entry.species_name}
        </span>
        <span className="line-clamp-1 font-mono text-[9px] text-muted">{sourceLabel(entry)}</span>
      </span>
    </div>
  );
}

// The unrevealed card back's diamond-tile lattice -- a faint, fixed brand
// pattern (not per-entry seeded, unlike the old grunge/stain treatment it
// replaces: every card back looks the same, like the reverse of a real deck
// of cards). Built once at module scope from mushroomOutline("button")
// (packages/ui's pure path-data helper, the same source MushroomMark itself
// draws from) rather than duplicating its path constants here.
const LATTICE_TILE_URL = (() => {
  const outline = mushroomOutline("button");
  const faint = "rgba(43,27,18,0.09)";
  const stalk = outline.stalkD
    ? `<path d="${outline.stalkD}" fill="${faint}"/>`
    : `<rect x="40" y="52" width="20" height="34" rx="10" fill="${faint}"/>`;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 100 100'>${stalk}<path d="${outline.capD}" fill="${faint}"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
})();

// A newly-collected, not-yet-revealed species (BACKLOG.md Ref 98 follow-up)
// -- the API already sends the full look/name (see MushroomCollectionEntry's
// comment), so "revealing" is purely a client-side flip-card moment plus a
// POST that persists it happened; nothing is fetched at reveal time. Mirrors
// SlideToCheckIn.tsx's own flip recipe: a [perspective] wrapper around a
// [transform-style:preserve-3d] grid whose two faces share one cell
// (col-start-1 row-start-1) and each hide their own back
// ([backface-visibility:hidden]), with the back face pre-rotated 180deg so
// it's right-side-up once the whole grid rotates.
function CollectionTile({ entry, onRevealed }: { entry: MushroomCollectionEntry; onRevealed: () => void }) {
  const [flipped, setFlipped] = useState(false);
  const [revealing, setRevealing] = useState(false);

  async function reveal() {
    if (flipped || revealing) return;
    setRevealing(true);
    try {
      const token = await getAccessToken();
      const res = await fetch(clientApiUrl(`/me/collection/${entry.id}/reveal`), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setFlipped(true);
        onRevealed();
      }
    } finally {
      setRevealing(false);
    }
  }

  return (
    <div className="[perspective:1200px]">
      <button
        type="button"
        onClick={reveal}
        disabled={revealing}
        aria-label={flipped ? entry.species_name : "Tap to reveal new species"}
        className={`grid w-full [transform-style:preserve-3d] transition-transform duration-500 motion-reduce:transition-none ${
          flipped ? "[transform:rotateY(180deg)]" : ""
        }`}
      >
        <div className="relative col-start-1 row-start-1 flex aspect-[5/7] w-full flex-col items-center justify-center gap-2.5 overflow-hidden rounded-2xl border border-border bg-card-alt shadow-[inset_0_0_16px_rgba(43,27,18,0.14)] [backface-visibility:hidden]">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-[13px] rounded-[5px]"
            style={{ backgroundImage: `${LATTICE_TILE_URL},${LATTICE_TILE_URL}`, backgroundSize: "40px 40px, 40px 40px", backgroundPosition: "0 0, 20px 20px" }}
          />
          <span aria-hidden className="pointer-events-none absolute inset-1.5 rounded-lg border-[1.5px] border-foreground/25" />
          <span aria-hidden className="pointer-events-none absolute inset-2.5 rounded-md border border-foreground/[0.14]" />
          <CornerMark shape="button" />
          <CornerMark shape="button" rotated />
          <span className="relative flex h-15 w-15 items-center justify-center rounded-full bg-brand-purple shadow-[0_2px_5px_rgba(43,27,18,0.3)]">
            <span aria-hidden className="absolute inset-1 rounded-full border-[1.5px] border-dashed border-card/70" />
            <span className="font-heading text-2xl leading-none font-extrabold text-on-accent">?</span>
          </span>
          <p className="relative font-mono text-[9px] font-medium tracking-[0.12em] text-foreground uppercase">
            Tap to reveal
          </p>
        </div>
        <div className="col-start-1 row-start-1 [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <CollectionCard entry={entry} />
        </div>
      </button>
    </div>
  );
}

export default function CollectionPage() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [detailIndex, setDetailIndex] = useState<number | null>(null);
  const refreshAccount = useAccountRefresh();

  useEffect(() => {
    load(setState);
  }, []);

  if (state.status === "loading") {
    return (
      <div className="flex min-h-[30vh] items-center justify-center">
        <MushroomLoader size={56} />
      </div>
    );
  }

  if (state.status === "error") {
    return <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>;
  }

  if (state.entries.length === 0) {
    return (
      <p className="text-sm text-muted">
        No mushrooms collected yet -- check in at a venue, join a neighborhood, or connect with a neighbor to
        discover your first species.
      </p>
    );
  }

  function handleRevealed() {
    // Only refreshes (tabs)/layout.tsx's unrevealed-count badge -- this
    // page's own `entries` deliberately isn't touched, so a flipped tile
    // doesn't move within the grid until the next fetch re-sorts everything
    // server-side.
    refreshAccount();
  }

  // Unrevealed first (stable sort preserves the API's own quantity/id order
  // within each group) so anything new to reveal is visible without
  // scrolling, without giving it a separate section/row of its own -- a
  // lone unrevealed tile just leads straight into the revealed grid on the
  // same row.
  const orderedEntries = [...state.entries].sort((a, b) => Number(a.revealed) - Number(b.revealed));
  // Only revealed entries are navigable in the detail modal -- an unrevealed
  // tile has no species/date/source to show yet, so it's excluded from both
  // the clickable set and the N/total count.
  const revealedEntries = orderedEntries.filter((entry) => entry.revealed);

  return (
    <section className="flex flex-col gap-2">
      <p className="text-[11px] font-extrabold tracking-wide text-muted uppercase">Discovered species</p>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {orderedEntries.map((entry) =>
          entry.revealed ? (
            <button
              key={entry.id}
              type="button"
              onClick={() => setDetailIndex(revealedEntries.findIndex((e) => e.id === entry.id))}
              className="w-full text-left"
            >
              <CollectionCard entry={entry} />
            </button>
          ) : (
            <CollectionTile key={entry.id} entry={entry} onRevealed={handleRevealed} />
          )
        )}
      </div>
      {detailIndex !== null && (
        <CollectionDetailModal
          entries={revealedEntries}
          index={detailIndex}
          onClose={() => setDetailIndex(null)}
          onNavigate={setDetailIndex}
        />
      )}
    </section>
  );
}
