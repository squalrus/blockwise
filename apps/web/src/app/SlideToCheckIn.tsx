"use client";

import { useEffect, useRef, useState } from "react";
import { MushroomLogo } from "@blockwise/ui";
import { CheckinResultCard } from "./CheckinResultCard";
import { useCheckIn, type CheckinStatus } from "./useCheckIn";

const THUMB_SIZE = 40;
const TRACK_INSET = 6;
const COMPLETE_THRESHOLD = 0.7;

// Full-interaction-fidelity take on the mockup's drag-to-check-in gesture:
// drag the thumb across the track and release past 70% to trigger the GPS
// check-in, or it springs back. Works identically for a business or a POI
// (BACKLOG.md "POIs and venues managed almost the same") -- one location id.
//
// Once an attempt resolves (success or a recoverable failure), the whole
// control flips over via a CSS 3D transform to reveal a result card --
// check-in status plus any badges/challenges just unlocked on success. Both
// faces sit in the same CSS grid cell (backface-visibility hidden on both,
// so only one is ever visible) rather than being absolutely positioned --
// grid auto-sizes the shared cell to the taller of the two, so a result card
// with several badge/challenge chips grows the control instead of
// overflowing past a fixed height.
export function SlideToCheckIn({
  locationId,
  // Component-library preview only (apps/web/src/app/dev/components) -- the
  // control starts idle and fully draggable like the real thing, but a
  // completed slide resolves to this canned outcome instead of making the
  // real useCheckIn network call, so every terminal state can be demoed by
  // actually sliding rather than loading pre-flipped. Never passed in real
  // usage.
  mockResolution,
}: {
  locationId: string;
  mockResolution?: CheckinStatus;
}) {
  const live = useCheckIn(locationId);
  const [mockStatus, setMockStatus] = useState<CheckinStatus>({ state: "idle" });
  const status = mockResolution ? mockStatus : live.status;
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragOriginRef = useRef(0);

  function checkIn() {
    if (!mockResolution) {
      live.checkIn();
      return;
    }
    // Briefly show "Checking in…" before flipping, matching the real
    // control's feel instead of resolving instantly.
    setMockStatus({ state: "checking" });
    setTimeout(() => setMockStatus(mockResolution), 500);
  }

  function reset() {
    if (mockResolution) {
      setMockStatus({ state: "idle" });
    } else {
      live.reset();
    }
  }

  const locked = status.state === "checking" || status.state === "success";
  const flipped =
    status.state === "success" ||
    status.state === "too_far" ||
    status.state === "cooldown" ||
    status.state === "error";

  function maxDragX(): number {
    const track = trackRef.current;
    if (!track) return 0;
    return Math.max(track.clientWidth - THUMB_SIZE - TRACK_INSET * 2, 0);
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (locked) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragOriginRef.current = e.clientX - dragX;
    setDragging(true);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging || locked) return;
    const next = Math.min(Math.max(e.clientX - dragOriginRef.current, 0), maxDragX());
    setDragX(next);
  }

  function handlePointerUp() {
    if (!dragging) return;
    setDragging(false);
    const max = maxDragX();
    if (max > 0 && dragX / max >= COMPLETE_THRESHOLD) {
      setDragX(max);
      checkIn();
    } else {
      setDragX(0);
    }
  }

  // Spring the thumb back after a failed/blocked attempt so the control is
  // ready to try again; success keeps it parked at the end of the track.
  useEffect(() => {
    if (status.state === "too_far" || status.state === "cooldown" || status.state === "error") {
      setDragX(0);
    }
  }, [status.state]);

  const thumbX = status.state === "success" ? maxDragX() : dragX;
  const label =
    status.state === "checking"
      ? "Checking in…"
      : status.state === "success"
        ? "Checked in ✓"
        : "Slide to check in →";

  return (
    <div className="[perspective:1200px]">
      <div
        className={`grid items-start [transform-style:preserve-3d] transition-transform duration-500 ${
          flipped ? "[transform:rotateY(180deg)]" : ""
        }`}
      >
        <div className="col-start-1 row-start-1 rounded-3xl bg-nav p-4 [backface-visibility:hidden]">
          <div
            ref={trackRef}
            className="relative flex h-[52px] items-center rounded-full bg-nav p-1.5"
            style={{ touchAction: "none" }}
          >
            <div
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className={`absolute left-1.5 flex items-center justify-center rounded-full bg-brand-orange shadow-none dark:shadow-[0_0_12px_rgba(255,107,61,0.6)] ${
                dragging ? "" : "transition-transform duration-300 ease-out"
              }`}
              style={{
                width: THUMB_SIZE,
                height: THUMB_SIZE,
                transform: `translateX(${thumbX}px)`,
                cursor: locked ? "default" : "grab",
              }}
            >
              <MushroomLogo size={20} capColor="var(--on-accent)" stemClassName="text-ink" />
            </div>
            <div className="flex-1 text-center text-sm font-extrabold text-nav-muted">{label}</div>
          </div>
        </div>

        <div className="col-start-1 row-start-1 [backface-visibility:hidden] [transform:rotateY(180deg)]">
          {(status.state === "success" ||
            status.state === "too_far" ||
            status.state === "cooldown" ||
            status.state === "error") && <CheckinResultCard status={status} onDismiss={reset} />}
        </div>
      </div>
    </div>
  );
}
