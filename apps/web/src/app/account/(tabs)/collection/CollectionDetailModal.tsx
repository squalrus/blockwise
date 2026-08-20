"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { MushroomCollectionEntry } from "@blockwise/types";
import { MushroomMark } from "@blockwise/ui";

// How far (px) a drag has to travel before it counts as a swipe rather than
// snapping back -- SlideTrack.tsx's SLIDE_COMPLETE_THRESHOLD is a fraction
// of track width instead, but there's no equivalent "track" here to measure
// against, so a flat pixel distance (roughly what a thumb naturally travels
// on a light flick) is the simplest stand-in.
const SWIPE_THRESHOLD_PX = 50;
const SLIDE_TRANSITION_MS = 220;

// One specimen's content, rendered three times per render (previous/current/
// next, see the track below) so a drag reveals the neighbor already sitting
// just off-screen rather than an empty gap. `interactive` is false for the
// two peeking neighbors so their source link can't be clicked mid-drag and
// doesn't fight the track's own pointer handlers.
function SpecimenCard({ entry, interactive }: { entry: MushroomCollectionEntry; interactive: boolean }) {
  const sourceHref = entry.source_type === "checkin" ? `/location/${entry.source_id}` : `/profile/${entry.source_username}`;
  const canLinkSource = entry.source_type === "checkin" || entry.source_username !== null;

  return (
    <div
      className={`flex h-full flex-col items-center justify-center gap-3 rounded-2xl bg-card px-6 py-6 text-center text-foreground shadow-xl select-none ${interactive ? "" : "pointer-events-none"}`}
    >
      <div className="relative">
        <MushroomMark {...entry.mushroom} size={140} outline />
        {entry.quantity > 1 && (
          <span className="absolute -right-2 -bottom-1 rounded-full bg-brand-orange px-2 py-1 text-xs font-extrabold text-on-accent">
            {entry.quantity}x
          </span>
        )}
      </div>

      <p className="font-heading text-lg font-extrabold break-words text-foreground">{entry.species_name}</p>

      <p className="text-sm text-muted">Unlocked {new Date(entry.first_collected_at).toLocaleString()}</p>

      {canLinkSource ? (
        <Link href={sourceHref} className="text-sm font-bold text-brand-purple hover:text-brand-orange">
          {entry.source_type === "checkin" ? entry.source_name : `with ${entry.source_name}`}
        </Link>
      ) : (
        <p className="text-sm text-muted">{`with ${entry.source_name}`}</p>
      )}
    </div>
  );
}

// Detail view for a single revealed collection entry, opened from a grid
// tile on collection/page.tsx. Mirrors FeedbackModal.tsx's backdrop/panel
// structure (fixed inset-0 overlay, backdrop click + stopPropagation on the
// panel), plus Escape-to-close and prev/next arrow-key nav borrowed from
// NeighborhoodSwitcher.tsx's document keydown pattern -- there was no
// existing gallery/arrow-nav component in the codebase to build on.
//
// The card sits in a 3-wide "track" (previous entry / current entry / next
// entry, each exactly one viewport-width slot) permanently positioned one
// slot to the left of center, so at rest only the middle slot shows -- a
// drag just translates the whole track, which is what reveals the neighbor
// sliding in from off-screen instead of an empty gap. A completed swipe (or
// the arrow buttons/keys, routed through the same goTo) animates the track
// the rest of the way to the neighbor slot, then swaps `index` and snaps the
// track back to centered with no transition -- since the neighbor's own
// card is already rendered pixel-identical in the new middle slot, that
// swap is invisible (the standard "infinite carousel" trick).
export function CollectionDetailModal({
  entries,
  index,
  onClose,
  onNavigate,
}: {
  entries: MushroomCollectionEntry[];
  index: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}) {
  const entry = entries[index];
  const prevEntry = index > 0 ? entries[index - 1] : null;
  const nextEntry = index < entries.length - 1 ? entries[index + 1] : null;
  const hasPrev = prevEntry !== null;
  const hasNext = nextEntry !== null;

  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [transitionOn, setTransitionOn] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [slotWidth, setSlotWidth] = useState(320);
  const dragOriginRef = useRef(0);
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function measure() {
      if (viewportRef.current) setSlotWidth(viewportRef.current.offsetWidth);
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Slides the track the rest of the way to the neighbor slot, then swaps
  // `index` and resets to centered. Shared by a completed drag, the arrow
  // buttons, and the arrow keys so every way of navigating looks identical.
  function goTo(direction: "next" | "prev") {
    if (navigating || (direction === "next" ? !hasNext : !hasPrev)) return;
    setNavigating(true);
    setDragging(false);
    setTransitionOn(true);
    setDragX(direction === "next" ? -slotWidth : slotWidth);

    window.setTimeout(() => {
      onNavigate(direction === "next" ? index + 1 : index - 1);
      setTransitionOn(false);
      setDragX(0);
      setNavigating(false);
    }, SLIDE_TRANSITION_MS);
  }

  // No dependency array -- goTo closes over index/hasPrev/hasNext/navigating
  // fresh each render, and re-subscribing every render is cheaper than
  // threading all of those through a dependency list just to dodge a stale
  // closure.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") goTo("prev");
      else if (e.key === "ArrowRight") goTo("next");
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  });

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (navigating) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragOriginRef.current = e.clientX;
    setTransitionOn(false);
    setDragging(true);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    const raw = e.clientX - dragOriginRef.current;
    // Clamped to 0 on whichever side has no neighbor, so dragging that way
    // meets resistance immediately instead of revealing an empty slot.
    const max = hasPrev ? slotWidth : 0;
    const min = hasNext ? -slotWidth : 0;
    setDragX(Math.min(max, Math.max(min, raw)));
  }

  function endDrag() {
    if (!dragging) return;
    setDragging(false);
    if (dragX <= -SWIPE_THRESHOLD_PX && hasNext) goTo("next");
    else if (dragX >= SWIPE_THRESHOLD_PX && hasPrev) goTo("prev");
    else {
      setTransitionOn(true);
      setDragX(0);
    }
  }

  if (!entry) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="flex w-full max-w-md flex-col gap-2.5" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-card text-muted shadow-md hover:text-foreground"
          >
            ✕
          </button>
        </div>

        <div ref={viewportRef} className="relative w-full overflow-hidden">
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            className="flex"
            style={{
              touchAction: "pan-y",
              transform: `translateX(${-slotWidth + dragX}px)`,
              transition: transitionOn ? `transform ${SLIDE_TRANSITION_MS}ms ease` : "none",
            }}
          >
            <div className="shrink-0 px-1" style={{ width: slotWidth }}>
              {prevEntry && <SpecimenCard entry={prevEntry} interactive={false} />}
            </div>
            <div className="shrink-0 px-1" style={{ width: slotWidth }}>
              <SpecimenCard entry={entry} interactive />
            </div>
            <div className="shrink-0 px-1" style={{ width: slotWidth }}>
              {nextEntry && <SpecimenCard entry={nextEntry} interactive={false} />}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-full bg-card/95 px-2 py-2 shadow-md">
          <button
            type="button"
            onClick={() => goTo("prev")}
            disabled={!hasPrev || navigating}
            aria-label="Previous species"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg leading-none text-foreground hover:bg-card-alt disabled:pointer-events-none disabled:opacity-30"
          >
            ‹
          </button>
          <span className="flex-1 text-center text-xs font-extrabold tracking-wide text-muted">
            {index + 1}/{entries.length}
          </span>
          <button
            type="button"
            onClick={() => goTo("next")}
            disabled={!hasNext || navigating}
            aria-label="Next species"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg leading-none text-foreground hover:bg-card-alt disabled:pointer-events-none disabled:opacity-30"
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
}
