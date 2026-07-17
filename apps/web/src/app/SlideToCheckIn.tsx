"use client";

import { useEffect, useRef, useState } from "react";
import type { AppUser } from "@blockwise/types";
import { MushroomLogo, MushroomMark, resolveMushroomConfig } from "@blockwise/ui";
import type { MushroomConfig, SpotShape } from "@blockwise/ui";
import { getCurrentUser } from "@/lib/auth";
import { CheckinResultCard } from "./CheckinResultCard";
import { SignInPrompt } from "./SignInPrompt";
import { useCheckIn, type CheckinStatus } from "./useCheckIn";

const THUMB_SIZE = 40;
const TRACK_INSET = 6;
const COMPLETE_THRESHOLD = 0.7;
// The slider face's total height (p-4's 16px top+bottom plus the 52px
// track) -- applied as the flip card's min-height below so a short result
// (e.g. "Check-in didn't go through" with no badges) never renders shorter
// than the control it replaced, only ever the same height or taller.
const CONTROL_HEIGHT_PX = 84;

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
// grid auto-sizes the shared cell to the taller of the two (so a result
// card with several badge/challenge chips grows the control instead of
// overflowing past a fixed height) and stretches both faces to fill that
// height (default align-items, not items-start), so a *shorter* result (no
// badges, a one-line error) doesn't visually shrink the card either -- the
// explicit min-height below is the floor for that same reason.
//
// The thumb itself renders the signed-in account's own mushroom (customized
// or hash-derived default, same as Avatar elsewhere), including its own
// background tint, rather than a generic fixed icon -- falls back to the
// original on-accent icon on a plain orange circle only until the user
// loads.
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
  const [user, setUser] = useState<AppUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getCurrentUser().then((u) => {
      if (cancelled) return;
      setUser(u);
      setAuthChecked(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // mockResolution means this is the /dev/components style-guide gallery,
  // not a real signed-out visitor -- keep it fully draggable there
  // regardless of auth state, per that page's "review every state by
  // actually sliding" purpose.
  const signedOut = !mockResolution && authChecked && !user;

  // The thumb is the account's own mushroom (its saved customization if one
  // exists, else the same hash-derived default Avatar would fall back to) --
  // null only while the user hasn't loaded yet, in which case the thumb
  // falls back to the generic on-accent icon below rather than flashing an
  // empty circle.
  const mushroom: MushroomConfig | null = user
    ? resolveMushroomConfig(
        user.id,
        user.mushroom_customization
          ? { ...user.mushroom_customization, spotShape: user.mushroom_customization.spotShape as SpotShape }
          : null
      )
    : null;

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

  if (signedOut) {
    return (
      <div className="rounded-3xl bg-nav p-4">
        <SignInPrompt message="to check in here." />
      </div>
    );
  }

  return (
    <div className="[perspective:1200px]">
      <div
        className={`grid [transform-style:preserve-3d] transition-transform duration-500 ${
          flipped ? "[transform:rotateY(180deg)]" : ""
        }`}
        style={{ minHeight: CONTROL_HEIGHT_PX }}
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
              className={`absolute left-1.5 flex items-center justify-center rounded-full shadow-none dark:shadow-[0_0_12px_rgba(255,107,61,0.6)] ${
                mushroom ? "" : "bg-brand-orange"
              } ${dragging ? "" : "transition-transform duration-300 ease-out"}`}
              style={{
                width: THUMB_SIZE,
                height: THUMB_SIZE,
                transform: `translateX(${thumbX}px)`,
                cursor: locked ? "default" : "grab",
              }}
            >
              {mushroom ? (
                <MushroomMark
                  size={THUMB_SIZE}
                  cap={mushroom.cap}
                  stalk={mushroom.stalk}
                  spots={mushroom.spots}
                  spotCount={mushroom.spotCount}
                  spotShape={mushroom.spotShape}
                  bg={mushroom.bg}
                />
              ) : (
                <MushroomLogo size={20} capColor="var(--on-accent)" stemClassName="text-ink" />
              )}
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
