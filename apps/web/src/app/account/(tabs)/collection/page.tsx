"use client";

import { useEffect, useState } from "react";
import type { MushroomCollectionEntry, MushroomShape } from "@blockwise/types";
import { MushroomLoader, MushroomMark, hashSeed, mulberry32 } from "@blockwise/ui";
import { getAccessToken } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";
import { useAccountRefresh } from "../../AccountContext";
import { CollectionDetailModal } from "./CollectionDetailModal";

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

// The actual collected-species content -- shared by an already-revealed
// grid tile (rendered plain, no transform) and CollectionTile's flip back
// face (which wraps this in its own rotateY(180deg), see below).
function RevealedContent({ entry }: { entry: MushroomCollectionEntry }) {
  return (
    <div className="flex h-33 flex-col items-center justify-center gap-1.5 overflow-hidden rounded-2xl bg-card-alt px-2 py-3.5 text-center">
      <div className="relative">
        <MushroomMark {...entry.mushroom} size={56} outline />
        {entry.quantity > 1 && (
          <span className="absolute -right-1.5 -bottom-1 rounded-full bg-brand-orange px-1.5 py-0.5 text-[10px] font-extrabold text-on-accent">
            {entry.quantity}x
          </span>
        )}
      </div>
      <p className="line-clamp-1 text-xs font-extrabold text-foreground">{entry.species_name}</p>
      <p className="line-clamp-1 text-[11px] text-muted">
        {entry.source_type === "checkin" ? entry.source_name : `with ${entry.source_name}`}
      </p>
    </div>
  );
}

// Deterministic "grunge" look for the reveal card back's warm-paper texture
// -- reuses the same hashSeed/mulberry32 PRNG a species' own mushroom look is
// generated with (packages/types/src/mushroom.ts), seeded off the entry id
// so every unrevealed tile's watermark shapes/stains are stable across
// re-renders but distinct from its neighbors, like individually worn cards
// rather than one stamped-out template. realShape is excluded from the pool
// (and shapeB from ever repeating shapeA) so the "mystery" silhouettes can
// never coincidentally give away -- or double up on -- the actual species.
const WATERMARK_SHAPES: MushroomShape[] = ["chanterelle", "parasol", "morel", "puffball", "shiitake", "oyster"];

function grungeLook(id: string, realShape: MushroomShape) {
  const rnd = mulberry32(hashSeed(id));
  const pick = <T,>(options: T[]) => options[Math.floor(rnd() * options.length)];
  const pool = WATERMARK_SHAPES.filter((shape) => shape !== realShape);
  const shapeA = pick(pool);
  const shapeB = pick(pool.filter((shape) => shape !== shapeA));
  return {
    shapeA,
    shapeB,
    rotA: -30 + Math.round(rnd() * 16),
    rotB: 10 + Math.round(rnd() * 18),
    grainSeed: Math.floor(rnd() * 1000),
    stain1: { x: 8 + rnd() * 22, y: 58 + rnd() * 30, o: 0.16 + rnd() * 0.1 },
    stain2: { x: 62 + rnd() * 26, y: 4 + rnd() * 24, o: 0.12 + rnd() * 0.08 },
  };
}

// An SVG fractal-noise filter as a data URI -- the standard self-contained
// "film grain" trick (no image asset to ship/fetch), layered with
// mix-blend-mode so it reads as paper fiber texture instead of literal
// static. `seed` varies per entry so tiles don't share one visible tiling.
function grainTextureUrl(seed: number) {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg'><filter id='n'>` +
    `<feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='${seed}' stitchTiles='stitch'/>` +
    `</filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

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
  const look = grungeLook(entry.id, entry.mushroom.shape);

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
        <div className="relative col-start-1 row-start-1 flex h-33 flex-col items-center justify-center gap-1.5 overflow-hidden rounded-2xl bg-card-alt px-2 py-3.5 text-center shadow-[inset_0_0_18px_rgba(43,27,18,0.22)] [backface-visibility:hidden]">
          {/* Warm-paper grunge: a seeded film-grain texture plus two seeded
              age-stain blobs (grungeLook/grainTextureUrl above), so every
              unrevealed card reads as its own worn specimen card. multiply
              darkens toward the stain/grain color on light paper;
              soft-light keeps it visible without just muddying dark paper. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 mix-blend-multiply opacity-40 dark:mix-blend-soft-light dark:opacity-70"
            style={{ backgroundImage: grainTextureUrl(look.grainSeed), backgroundSize: "140px 140px" }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 mix-blend-multiply dark:mix-blend-soft-light"
            style={{
              backgroundImage: `radial-gradient(ellipse 60% 45% at ${look.stain1.x}% ${look.stain1.y}%, rgba(43,27,18,${look.stain1.o}), transparent 70%), radial-gradient(ellipse 55% 40% at ${look.stain2.x}% ${look.stain2.y}%, rgba(43,27,18,${look.stain2.o}), transparent 70%)`,
            }}
          />
          {/* Bigger silhouettes hinting "a mushroom is in here" without giving
              away which one -- currentColor + a low-opacity wrapper so the
              tint follows --foreground's per-theme flip (dark ink on light
              paper, light ink on dark paper) instead of a hardcoded color. */}
          <div aria-hidden className="pointer-events-none absolute inset-0 text-foreground opacity-[0.16]">
            <div className="absolute -top-4 -left-5" style={{ transform: `rotate(${look.rotA}deg)` }}>
              <MushroomMark shape={look.shapeA} cap="currentColor" stalk="currentColor" spotCount={0} size={68} />
            </div>
            <div className="absolute -right-5 -bottom-5" style={{ transform: `rotate(${look.rotB}deg)` }}>
              <MushroomMark shape={look.shapeB} cap="currentColor" stalk="currentColor" spotCount={0} size={62} />
            </div>
          </div>
          <span className="relative flex h-14 w-14 items-center justify-center rounded-full border-2 border-brand-purple bg-brand-purple text-2xl font-extrabold text-on-accent shadow-[0_2px_4px_rgba(43,27,18,0.3)]">
            ?
          </span>
          <p className="relative text-[11px] font-extrabold text-foreground">Tap to reveal</p>
        </div>
        <div className="col-start-1 row-start-1 [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <RevealedContent entry={entry} />
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
        No mushrooms collected yet -- check in at a venue or connect with a neighbor to discover your first species.
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
              <RevealedContent entry={entry} />
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
