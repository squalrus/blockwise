"use client";

import { useEffect, useRef, useState } from "react";
import type { AppUser } from "@blockwise/types";
import { MushroomLogo, MushroomMark, resolveMushroomConfig } from "@blockwise/ui";
import type { MushroomConfig, SpotShape } from "@blockwise/ui";
import { getCurrentUser } from "@/lib/auth";
import { SignInPrompt } from "./SignInPrompt";

export const SLIDE_THUMB_SIZE = 40;
// Apple HIG's minimum recommended touch target (44x44pt) -- the visible
// thumb stays SLIDE_THUMB_SIZE, but the draggable hit area is padded out to
// this so the control is easy to grab on iOS without looking any bigger.
export const SLIDE_THUMB_HIT_SIZE = 44;
export const SLIDE_TRACK_INSET = 6;
export const SLIDE_COMPLETE_THRESHOLD = 0.7;
// The bare track's height -- both SlideToCheckIn and SlideToRedeem size
// their surrounding layout (flip-card min-height, etc.) off this constant
// so the two controls line up exactly.
export const SLIDE_TRACK_HEIGHT_PX = 52;

export interface SlideTrackProps {
  label: string;
  locked: boolean;
  // Keeps the thumb pinned at the end of the track (e.g. after a completed
  // slide succeeds) instead of following dragX.
  parkedAtEnd: boolean;
  // Springs the thumb back to the start -- set true by the caller whenever
  // it enters a recoverable-failure state, since a completed-but-failed
  // slide otherwise leaves the thumb parked at the end.
  snapBack: boolean;
  onComplete: () => void;
  // Shown instead of the track when signed out; omit to skip the check
  // entirely (e.g. redeeming a coupon claim, which only a signed-in owner
  // could reach in the first place) or to keep dragging enabled regardless
  // of auth state (SlideToCheckIn's dev-gallery mock mode).
  signInPromptMessage?: string;
}

// Shared drag mechanics + personalized mushroom-avatar thumb for every
// slide-to-confirm gesture in the app (check-in, coupon redemption, ...).
// Callers own their own network call and status state machine, driving this
// purely through locked/parkedAtEnd/snapBack/onComplete/label -- what
// happens after completion (SlideToCheckIn's flip to a reward-reveal result
// card vs SlideToRedeem's flatter inline/button states) stays caller-side.
export function SlideTrack({
  label,
  locked,
  parkedAtEnd,
  snapBack,
  onComplete,
  signInPromptMessage,
}: SlideTrackProps) {
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

  useEffect(() => {
    if (snapBack) setDragX(0);
  }, [snapBack]);

  function maxDragX(): number {
    const track = trackRef.current;
    if (!track) return 0;
    return Math.max(track.clientWidth - SLIDE_THUMB_SIZE - SLIDE_TRACK_INSET * 2, 0);
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
    if (max > 0 && dragX / max >= SLIDE_COMPLETE_THRESHOLD) {
      setDragX(max);
      onComplete();
    } else {
      setDragX(0);
    }
  }

  const signedOut = !!signInPromptMessage && authChecked && !user;
  if (signedOut) {
    return (
      <div className="rounded-3xl bg-nav p-4">
        <SignInPrompt message={signInPromptMessage!} />
      </div>
    );
  }

  // The thumb is the account's own mushroom (its saved customization if one
  // exists, else the same hash-derived default Avatar would fall back to) --
  // null only until the user loads, in which case the thumb falls back to a
  // generic on-accent icon on a plain orange circle below.
  const mushroom: MushroomConfig | null = user
    ? resolveMushroomConfig(
        user.id,
        user.mushroom_customization
          ? { ...user.mushroom_customization, spotShape: user.mushroom_customization.spotShape as SpotShape }
          : null
      )
    : null;

  const thumbX = parkedAtEnd ? maxDragX() : dragX;

  return (
    <div
      ref={trackRef}
      className="relative flex items-center rounded-full bg-nav p-1.5"
      style={{ height: SLIDE_TRACK_HEIGHT_PX, touchAction: "none" }}
    >
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`absolute top-1/2 flex items-center justify-center rounded-full ${
          dragging ? "" : "transition-transform duration-300 ease-out"
        }`}
        style={{
          left: SLIDE_TRACK_INSET - (SLIDE_THUMB_HIT_SIZE - SLIDE_THUMB_SIZE) / 2,
          width: SLIDE_THUMB_HIT_SIZE,
          height: SLIDE_THUMB_HIT_SIZE,
          transform: `translate(${thumbX}px, -50%)`,
          cursor: locked ? "default" : "grab",
        }}
      >
        <div
          className={`pointer-events-none flex items-center justify-center rounded-full shadow-none dark:shadow-[0_0_12px_rgba(255,107,61,0.6)] ${
            mushroom ? "" : "bg-brand-orange"
          }`}
          style={{ width: SLIDE_THUMB_SIZE, height: SLIDE_THUMB_SIZE }}
        >
          {mushroom ? (
            <MushroomMark
              size={SLIDE_THUMB_SIZE}
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
      </div>
      <div className="flex-1 text-center text-sm font-extrabold text-nav-muted">{label}</div>
    </div>
  );
}
