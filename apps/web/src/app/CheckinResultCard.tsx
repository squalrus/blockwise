import type { CheckinStatus } from "./useCheckIn";
import { BadgeIcon } from "./BadgeIcon";

type ResultStatus = Exclude<CheckinStatus, { state: "idle" } | { state: "checking" }>;

// The "back" face of SlideToCheckIn's flip card -- the outcome of a
// completed attempt (success or one of the recoverable failure states),
// plus any badges/challenges the check-in unlocked. Tapping a
// recoverable-failure card calls onDismiss to flip back to the slider for
// another try; success has nothing to retry, so it isn't tappable.
export function CheckinResultCard({ status, onDismiss }: { status: ResultStatus; onDismiss: () => void }) {
  if (status.state === "success") {
    const { rewards } = status;
    const unlockCount = rewards.badges_earned.length + rewards.challenges_completed.length;
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-3xl bg-nav px-5 py-4 text-center">
        {/* Sits above the unlock rows below (relative + z-index) so the
            first row visibly slides out from behind it rather than over
            top of it. */}
        <p className="relative z-[100] text-sm font-extrabold text-nav-muted">
          Checked in ✓ <span className="text-brand-orange">+{rewards.points_earned} pts</span>
        </p>
        {unlockCount > 0 && (
          <div className="flex w-full flex-col gap-2">
            {rewards.badges_earned.map((badge, i) => (
              <div
                key={badge.id}
                className="unlock-card relative flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 text-left"
                style={{ animationDelay: `${i * 140}ms`, zIndex: unlockCount - i }}
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-nav-foreground bg-brand-amber text-xl">
                  <BadgeIcon icon={badge.icon} name={badge.name} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-extrabold text-nav-foreground">{badge.name}</p>
                  {badge.description && <p className="mt-0.5 text-xs text-nav-muted">{badge.description}</p>}
                </div>
              </div>
            ))}
            {rewards.challenges_completed.map((challenge, j) => {
              const i = rewards.badges_earned.length + j;
              return (
                <div
                  key={challenge.id}
                  className="unlock-card relative flex items-center justify-between gap-3 rounded-2xl bg-white/10 px-4 py-3 text-left"
                  style={{ animationDelay: `${i * 140}ms`, zIndex: unlockCount - i }}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold text-nav-foreground">{challenge.title}</p>
                    <p className="mt-0.5 text-xs font-bold text-brand-green">+{challenge.points_reward} pts</p>
                  </div>
                  {challenge.badge && (
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-nav-foreground bg-brand-amber text-lg">
                      <BadgeIcon icon={challenge.badge.icon} name={challenge.badge.name} />
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const message =
    status.state === "too_far"
      ? `You're about ${Math.round(status.distanceMeters)}m away — get closer to check in.`
      : status.state === "cooldown"
        ? `${
            status.scope === "target"
              ? "Already checked in here recently."
              : "You checked in somewhere else recently."
          } Try again after ${new Date(status.retryAt).toLocaleTimeString()}.`
        : status.message;

  return (
    <button
      type="button"
      onClick={onDismiss}
      className="flex h-full w-full flex-col items-center justify-center gap-1 rounded-3xl bg-nav px-5 py-4 text-center"
    >
      <span className="text-sm font-extrabold text-nav-muted">Check-in didn&apos;t go through</span>
      <span className="text-xs text-nav-muted">{message}</span>
      <span className="mt-0.5 text-[11px] font-extrabold text-brand-orange">Tap to try again</span>
    </button>
  );
}
