"use client";

import { useEffect, useRef, useState } from "react";
import { MushroomLogo } from "@blockwise/ui";
import { useCheckIn } from "./useCheckIn";

const THUMB_SIZE = 40;
const TRACK_INSET = 6;
const COMPLETE_THRESHOLD = 0.7;

// Full-interaction-fidelity take on the mockup's drag-to-check-in gesture:
// drag the thumb across the track and release past 70% to trigger the GPS
// check-in, or it springs back. Works identically for a business or a POI
// (BACKLOG.md "POIs and venues managed almost the same") -- one location id.
export function SlideToCheckIn({ locationId }: { locationId: string }) {
  const { status, checkIn } = useCheckIn(locationId);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragOriginRef = useRef(0);

  const locked = status.state === "checking" || status.state === "success";

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
    <div className="rounded-full bg-nav p-4">
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

      {status.state === "too_far" && (
        <p className="mt-2 text-sm text-nav-muted">
          You&apos;re about {Math.round(status.distanceMeters)}m away — get closer to check in.
        </p>
      )}
      {status.state === "cooldown" && (
        <p className="mt-2 text-sm text-nav-muted">
          {status.scope === "target"
            ? "Already checked in here recently."
            : "You checked in somewhere else recently."}{" "}
          Try again after {new Date(status.retryAt).toLocaleTimeString()}.
        </p>
      )}
      {status.state === "error" && (
        <p className="mt-2 text-sm text-red-400">{status.message}</p>
      )}
    </div>
  );
}
