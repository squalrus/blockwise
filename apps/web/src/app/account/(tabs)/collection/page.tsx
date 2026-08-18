"use client";

import { useEffect, useState } from "react";
import type { MushroomCollectionEntry } from "@blockwise/types";
import { MushroomLoader, MushroomMark } from "@blockwise/ui";
import { getAccessToken } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";
import { useAccountRefresh } from "../../AccountContext";

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
    <div className="flex min-h-33 flex-col items-center justify-center gap-1.5 rounded-2xl bg-card-alt px-2 py-3.5 text-center">
      <div className="relative">
        <MushroomMark {...entry.mushroom} size={56} />
        {entry.quantity > 1 && (
          <span className="absolute -right-1.5 -bottom-1 rounded-full bg-brand-orange px-1.5 py-0.5 text-[10px] font-extrabold text-on-accent">
            {entry.quantity}x
          </span>
        )}
      </div>
      <p className="text-xs font-extrabold text-foreground">{entry.species_name}</p>
      <p className="text-[11px] text-muted">
        {entry.source_type === "checkin" ? entry.source_name : `with ${entry.source_name}`}
      </p>
    </div>
  );
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
function CollectionTile({ entry, onRevealed }: { entry: MushroomCollectionEntry; onRevealed: (id: string) => void }) {
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
        onRevealed(entry.id);
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
        className={`grid w-full [transform-style:preserve-3d] transition-transform duration-500 ${
          flipped ? "[transform:rotateY(180deg)]" : ""
        }`}
      >
        <div className="col-start-1 row-start-1 flex min-h-33 flex-col items-center justify-center gap-1.5 rounded-2xl bg-brand-purple px-2 py-3.5 text-center [backface-visibility:hidden]">
          <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-on-accent text-2xl font-extrabold text-on-accent">
            ?
          </span>
          <p className="text-[11px] font-extrabold text-on-accent">Tap to reveal</p>
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

  const unrevealed = state.entries.filter((entry) => !entry.revealed);
  const revealed = state.entries.filter((entry) => entry.revealed);

  function handleRevealed(id: string) {
    setState((prev) =>
      prev.status === "ready"
        ? { status: "ready", entries: prev.entries.map((e) => (e.id === id ? { ...e, revealed: true } : e)) }
        : prev
    );
    // Updates the Collection tab's unrevealed-count badge in (tabs)/layout.tsx.
    refreshAccount();
  }

  return (
    <section className="flex flex-col gap-4">
      {unrevealed.length > 0 && (
        <div>
          <p className="mb-2 text-[11px] font-extrabold tracking-wide text-muted uppercase">
            New species to reveal
          </p>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {unrevealed.map((entry) => (
              <CollectionTile key={entry.id} entry={entry} onRevealed={handleRevealed} />
            ))}
          </div>
        </div>
      )}

      {revealed.length > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {revealed.map((entry) => (
            <RevealedContent key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </section>
  );
}
