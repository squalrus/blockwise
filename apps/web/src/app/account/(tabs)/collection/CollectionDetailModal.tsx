"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import type { MushroomCollectionEntry } from "@blockwise/types";
import { MushroomMark, hashSeed, mulberry32 } from "@blockwise/ui";
import { CornerMark } from "./CornerMark";

// How far (px) a drag has to travel before it counts as a swipe rather than
// snapping back -- SlideTrack.tsx's SLIDE_COMPLETE_THRESHOLD is a fraction
// of track width instead, but there's no equivalent "track" here to measure
// against, so a flat pixel distance (roughly what a thumb naturally travels
// on a light flick) is the simplest stand-in.
const SWIPE_THRESHOLD_PX = 50;
const SLIDE_TRANSITION_MS = 220;
// The card itself is narrower than the viewport it slides within (below),
// leaving room for the previous/next cards to peek in from the sides at
// rest -- both a visual hint that there's more to swipe to and a smaller,
// less whitespace-heavy card than one stretched to the full modal width.
// Sized a bit taller than the strict minimum (still 5:7) so a location name
// that wraps to a second "Found" line has real slack to grow into instead of
// crowding the row above/below it.
const CARD_MAX_WIDTH = 300;
const CARD_WIDTH_RATIO = 0.72;
// Caps the viewport used for centering/peek math (see viewportWidth below)
// to the same width as the close-button/nav-bar rows' own max-w-md, rather
// than the raw window width -- otherwise a wide desktop window stretches the
// peek out far enough to pull the (never-meant-to-be-visible) +-2 preloaded
// cards into view with their rounded corners clipped by the viewport's own
// overflow-hidden edge. On a narrow/mobile viewport this cap never engages
// -- the real screen width is already smaller than it -- so cards still
// slide truly edge-to-edge there. Kept generous (rather than just enough to
// hide +-2) so a tilted peeking neighbor reads as a whole loose card glimpsed
// at an angle, not a thin, oddly-cropped diagonal sliver.
const VIEWPORT_MAX_WIDTH = 520;
// The track renders a wider window than what's ever visible (only the
// center slot and its immediate neighbors peek into the viewport) so that
// swiping twice in a row never mounts a card for the first time mid-swipe --
// entries[index+2]/[index-2] are already sitting rendered one slot further
// off-track, ready to slide into the "peeking neighbor" position the moment
// they're needed instead of popping in unrendered.
const WINDOW_OFFSETS = [-2, -1, 0, 1, 2];
const CENTER_OFFSET_INDEX = 2;
// A peeking/preloaded card tilts like a loose physical card, straightening
// to upright as it becomes the centered one -- BASE_TILT_DEG scales with how
// many slots a card sits from center (so the far-preloaded +-2 cards, never
// actually visible, would fan out further still), and JITTER_RANGE_DEG adds
// a small per-card variation (seeded off the entry id, stable across
// re-renders) so neighboring tilts don't look mechanically identical.
const BASE_TILT_DEG = 4;
const JITTER_RANGE_DEG = 4;

function cardJitterDeg(id: string): number {
  const rnd = mulberry32(hashSeed(`tilt:${id}`));
  return (rnd() - 0.5) * JITTER_RANGE_DEG;
}

// One labeled row in a SpecimenCard's info block below its name -- a mono
// uppercase label on the left, the value right-aligned, divided from the row
// above by `border-background` (a subtler hairline than the app's usual
// `border-border`, matching how the mock sets these particular dividers off
// from the card's own `bg-card` background rather than a stronger rule).
function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 border-t border-background py-1.5">
      <span className="font-mono text-[9px] font-medium tracking-[0.06em] text-muted uppercase">{label}</span>
      <span className="text-xs font-bold text-foreground">{value}</span>
    </div>
  );
}

// One specimen's content, rendered up to five times per render (the
// index-2..index+2 preload window, see the track below) so a drag reveals
// the neighbor already sitting just off-screen rather than an empty gap.
// `interactive` is false for every slot but the centered one so a peeking or
// preloaded neighbor's source link can't be clicked mid-drag and doesn't
// fight the track's own pointer handlers. `index` is that entry's position
// in the full revealed list (not just its slot offset), for the "No. NN"
// corner label. `rotationDeg`/`animateRotation` are this slot's current
// physical-card tilt and whether it should ease toward that value (see
// BASE_TILT_DEG above) or apply it immediately (mid-drag, tracking the
// pointer 1:1). `overflow-hidden` keeps every card the exact same
// aspect-ratio size no matter how long its location name is -- a long
// "Found" value wraps onto a second line (never an ellipsis) rather than
// growing the card, since there's enough padding/gap slack in a typical
// two-line wrap to avoid clipping anything else.
function SpecimenCard({
  entry,
  index,
  interactive,
  rotationDeg,
  animateRotation,
}: {
  entry: MushroomCollectionEntry;
  index: number;
  interactive: boolean;
  rotationDeg: number;
  animateRotation: boolean;
}) {
  const sourceHref = entry.source_type === "checkin" ? `/location/${entry.source_id}` : `/profile/${entry.source_username}`;
  const canLinkSource = entry.source_type === "checkin" || entry.source_username !== null;

  return (
    <div
      className={`relative flex aspect-[5/7] w-full flex-col items-center justify-between gap-1.5 overflow-hidden rounded-2xl border border-border bg-card px-5 pt-6 pb-5 text-center text-foreground shadow-xl select-none ${interactive ? "" : "pointer-events-none"}`}
      style={{
        transform: `rotate(${rotationDeg}deg)`,
        transition: animateRotation ? `transform ${SLIDE_TRANSITION_MS}ms ease` : "none",
      }}
    >
      <span aria-hidden className="pointer-events-none absolute inset-2.5 rounded-xl border-[1.5px] border-foreground/10" />
      <CornerMark initial={entry.species_name.charAt(0)} shape={entry.mushroom.shape} size={13} />
      <span className="absolute top-4 right-5 font-mono text-[9px] font-medium text-muted">
        No. {String(index + 1).padStart(2, "0")}
      </span>

      <div className="relative mt-1 flex h-32 w-32 shrink-0 items-center justify-center rounded-full bg-background/60">
        <MushroomMark {...entry.mushroom} size={104} outline />
        {entry.quantity > 1 && (
          <span className="absolute right-1 bottom-0.5 rounded-full bg-brand-orange px-2 py-1 text-xs font-extrabold text-on-accent">
            {entry.quantity}x
          </span>
        )}
      </div>

      <p className="font-heading text-lg leading-tight font-extrabold break-words text-foreground">{entry.species_name}</p>

      <div className="flex w-full flex-col px-2">
        <InfoRow label="Shape" value={<span className="capitalize">{entry.mushroom.shape}</span>} />
        <InfoRow label="Spots" value={`${entry.mushroom.spotCount} · ${entry.mushroom.spotShape}`} />
        <InfoRow label="Collected" value={`${entry.quantity}x`} />
        <InfoRow
          label="Found"
          value={
            canLinkSource ? (
              <Link href={sourceHref} className="text-brand-purple hover:text-brand-orange">
                {entry.source_type === "checkin" ? entry.source_name : `with ${entry.source_name}`}
              </Link>
            ) : (
              `with ${entry.source_name}`
            )
          }
        />
        <InfoRow
          label="Unlocked"
          value={new Date(entry.first_collected_at).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        />
      </div>
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
// The card sits in a 5-wide "track" (index-2 .. index+2, each a same-width
// slot, see WINDOW_OFFSETS above) permanently positioned so the center slot
// sits centered in the viewport at rest -- only the center slot and its
// immediate neighbors actually peek into the viewport's visible width, the
// outer two exist purely so they're already mounted (mushroom mark rendered,
// layout settled) by the time a swipe brings them into the peeking position,
// rather than mounting for the first time at that moment. A drag just
// translates the whole track, which is what reveals a neighbor sliding in
// from off-screen instead of an empty gap. A completed swipe (or the arrow
// buttons/keys, routed through the same goTo) animates the track the rest of
// the way to the neighbor slot, then swaps `index` and snaps the track back
// to centered with no transition -- since the neighbor's own card is already
// rendered pixel-identical in the new middle slot, that swap is invisible
// (the standard "infinite carousel" trick).
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
  const hasPrev = index > 0;
  const hasNext = index < entries.length - 1;
  // The 5-wide preload window (see WINDOW_OFFSETS above) -- entries outside
  // entries' own bounds are just null slots, same as the old prevEntry/
  // nextEntry ever being null at either end of the list.
  const windowEntries = WINDOW_OFFSETS.map((offset) => entries[index + offset] ?? null);

  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [transitionOn, setTransitionOn] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(320);
  const dragOriginRef = useRef(0);
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function measure() {
      if (viewportRef.current) setViewportWidth(viewportRef.current.offsetWidth);
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Each slot (the unit a swipe/nav step moves by) is narrower than the
  // viewport it sits in -- see CARD_MAX_WIDTH/CARD_WIDTH_RATIO above -- so
  // the previous/next cards' edges peek in at rest instead of sitting fully
  // off-screen.
  const slotWidth = Math.min(viewportWidth * CARD_WIDTH_RATIO, CARD_MAX_WIDTH);
  // Resting translateX that centers the middle (current) slot within the
  // viewport: the center slot is CENTER_OFFSET_INDEX slots into the track,
  // so its own center sits at (CENTER_OFFSET_INDEX + 0.5) * slotWidth along
  // the track -- shifting the track left by that much minus half the
  // viewport width lands that point at the viewport's own center.
  const restingOffset = viewportWidth / 2 - (CENTER_OFFSET_INDEX + 0.5) * slotWidth;
  // How far along a slot-to-slot move the track currently is, from the same
  // dragX that drives its translateX -- 0 at rest, continuously -1..1 while
  // a manual drag is in progress, and discretely +-1 (CSS-eased toward it)
  // during a programmatic goTo. Feeds each slot's tilt below so a card's
  // rotation animates in lockstep with its position instead of snapping.
  const dragProgress = slotWidth > 0 ? dragX / slotWidth : 0;

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
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-2.5 bg-black/40 py-4"
      onClick={onClose}
    >
      <div className="flex w-full max-w-md justify-end px-4" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-card text-muted shadow-md hover:text-foreground"
        >
          ✕
        </button>
      </div>

      {/* Spans the full width up to a cap (VIEWPORT_MAX_WIDTH above), not the
          narrower max-w-md the rows above/below use -- so on a narrow/mobile
          screen the peeking previous/next cards still travel all the way to
          the real screen edges (the cap never engages there), while a wide
          desktop window doesn't stretch that peek out far enough to reveal
          the +-2 preloaded cards with their corners clipped by the overflow
          boundary below. Vertical padding is deliberate too: `transform:
          rotate()` is paint-only and never changes an element's layout box,
          so a tilted card's rounded top/bottom corners visually poke past
          its own (unrotated) layout height -- without this padding, this
          div's overflow-hidden clips exactly at that unrotated edge and
          slices the corners off a tilted neighbor. */}
      <div
        ref={viewportRef}
        className="relative w-full overflow-hidden py-5"
        style={{ maxWidth: VIEWPORT_MAX_WIDTH }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className="flex"
          style={{
            touchAction: "pan-y",
            transform: `translateX(${restingOffset + dragX}px)`,
            transition: transitionOn ? `transform ${SLIDE_TRANSITION_MS}ms ease` : "none",
          }}
        >
          {WINDOW_OFFSETS.map((offset, slotIndex) => {
            const slotEntry = windowEntries[slotIndex];
            const effectiveOffset = offset + dragProgress;
            const jitter = slotEntry ? cardJitterDeg(slotEntry.id) * Math.min(Math.abs(effectiveOffset), 1) : 0;
            const rotationDeg = effectiveOffset * BASE_TILT_DEG + jitter;
            return (
              <div key={offset} className="shrink-0 px-4" style={{ width: slotWidth }}>
                {slotEntry && (
                  <SpecimenCard
                    entry={slotEntry}
                    index={index + offset}
                    interactive={offset === 0}
                    rotationDeg={rotationDeg}
                    animateRotation={transitionOn}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div
        className="flex w-full max-w-md items-center justify-between gap-3 rounded-full bg-card/95 px-2 py-2 shadow-md"
        onClick={(e) => e.stopPropagation()}
      >
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
  );
}
