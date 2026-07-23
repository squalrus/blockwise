"use client";

import { useState } from "react";
import { CheckinResultCard } from "./CheckinResultCard";
import { SLIDE_TRACK_HEIGHT_PX, SlideTrack } from "./SlideTrack";
import { useCheckIn, type CheckinStatus } from "./useCheckIn";

// Full-interaction-fidelity take on the mockup's drag-to-check-in gesture:
// drag the thumb across the track and release past 70% to trigger the GPS
// check-in, or it springs back. Shares its drag mechanics and personalized
// mushroom-avatar thumb with SlideToRedeem via SlideTrack, so the two
// controls line up visually -- only the messaging and what happens after
// completion differ. Works identically for a business or a POI (BACKLOG.md
// "POIs and venues managed almost the same") -- one location id.
//
// Once an attempt resolves (success or a recoverable failure), the whole
// control flips over via a CSS 3D transform to reveal a result card --
// check-in status plus any badges/challenges just unlocked on success
// (SlideToRedeem's flatter states have no reward payload to reveal, so it
// skips this). Both faces sit in the same CSS grid cell (backface-visibility
// hidden on both, so only one is ever visible) rather than being absolutely
// positioned -- grid auto-sizes the shared cell to the taller of the two (so
// a result card with several badge/challenge chips grows the control instead
// of overflowing past a fixed height) and stretches both faces to fill that
// height (default align-items, not items-start), so a *shorter* result (no
// badges, a one-line error) doesn't visually shrink the card either.
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
  const recoverableFailure =
    status.state === "too_far" || status.state === "cooldown" || status.state === "error";
  const flipped = status.state === "success" || recoverableFailure;

  const label =
    status.state === "checking"
      ? "Checking in…"
      : status.state === "success"
        ? "Checked in ✓"
        : "Slide to check in →";

  return (
    <div className="[perspective:1200px]">
      <div
        className={`grid [transform-style:preserve-3d] transition-transform duration-500 ${
          flipped ? "[transform:rotateY(180deg)]" : ""
        }`}
        style={{ minHeight: SLIDE_TRACK_HEIGHT_PX }}
      >
        <div className="col-start-1 row-start-1 [backface-visibility:hidden]">
          <SlideTrack
            label={label}
            locked={locked}
            parkedAtEnd={status.state === "success"}
            snapBack={recoverableFailure}
            onComplete={checkIn}
            // mockResolution means this is the /dev/components style-guide
            // gallery, not a real signed-out visitor -- keep it fully
            // draggable there regardless of auth state, per that page's
            // "review every state by actually sliding" purpose.
            signInPromptMessage={mockResolution ? undefined : "to check in here."}
          />
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
