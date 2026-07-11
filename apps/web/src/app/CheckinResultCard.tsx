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
    return (
      <div className="flex w-full flex-col items-center gap-2 rounded-3xl bg-nav px-5 py-4 text-center">
        <p className="text-sm font-extrabold text-nav-muted">
          Checked in ✓ <span className="text-brand-orange">+{rewards.points_earned} pts</span>
        </p>
        {(rewards.badges_earned.length > 0 || rewards.challenges_completed.length > 0) && (
          <ul className="flex flex-wrap items-center justify-center gap-1.5">
            {rewards.badges_earned.map((badge) => (
              <li
                key={badge.id}
                className="flex items-center gap-1 rounded-full bg-brand-amber px-2.5 py-1 text-[11px] font-extrabold text-ink"
              >
                <BadgeIcon icon={badge.icon} name={badge.name} />
                {badge.name}
              </li>
            ))}
            {rewards.challenges_completed.map((challenge) => (
              <li
                key={challenge.id}
                className="flex items-center gap-1 rounded-full bg-brand-green px-2.5 py-1 text-[11px] font-extrabold text-white"
              >
                🎉 {challenge.title}
              </li>
            ))}
          </ul>
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
      className="flex w-full flex-col items-center gap-1 rounded-3xl bg-nav px-5 py-4 text-center"
    >
      <span className="text-sm font-extrabold text-nav-muted">Check-in didn&apos;t go through</span>
      <span className="text-xs text-nav-muted">{message}</span>
      <span className="mt-0.5 text-[11px] font-extrabold text-brand-orange">Tap to try again</span>
    </button>
  );
}
