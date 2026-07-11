import type { AppUser, UserPointsSummary } from "@blockwise/types";
import { Avatar } from "../Avatar";
import { ProgressBar } from "../ProgressBar";

// BACKLOG.md Ref 47: profile summary card at the top of the account page --
// avatar, level/points progress, and activity counts, each count linking
// down to its full list section further down this same page. Level is
// computed server-side (GET /me/points, apps/api's gamification/points.ts
// computeLevel) rather than here, so it agrees with the badge rule engine's
// "level_reached" badges, which need the same number.
export function ProfileSummaryCard({
  user,
  favoriteCount,
  checkinCount,
  pointsSummary,
}: {
  user: AppUser;
  favoriteCount: number;
  checkinCount: number;
  pointsSummary: UserPointsSummary;
}) {
  const label = user.display_name ?? user.username ?? user.email ?? "You";
  const { points, level, points_into_level: pointsIntoLevel, points_to_next_level: pointsToNext } = pointsSummary;
  const percent = (pointsIntoLevel / (pointsIntoLevel + pointsToNext)) * 100;

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-card-alt px-5 py-4">
      <div className="flex items-center gap-3.5">
        <Avatar avatarUrl={user.avatar_url} label={label} size={56} />
        <div>
          <span className="font-heading text-xl font-extrabold text-foreground">{label}</span>
          <p className="mt-0.5 text-xs font-bold text-muted">
            Level {level} forager · {points} pts
          </p>
        </div>
      </div>

      <div>
        <div className="flex justify-between text-[11.5px] font-extrabold text-muted">
          <span>Level {level}</span>
          <span>{pointsToNext} pts to Level {level + 1}</span>
        </div>
        <div className="mt-1.5">
          <ProgressBar percent={percent} height={10} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2.5 text-center">
        <a href="#favorites" className="rounded-xl bg-card px-2.5 py-2.5">
          <p className="font-heading text-lg font-extrabold text-brand-orange">{favoriteCount}</p>
          <p className="text-[10.5px] font-bold text-muted">Favorites</p>
        </a>
        <a href="#checkins" className="rounded-xl bg-card px-2.5 py-2.5">
          <p className="font-heading text-lg font-extrabold text-brand-green">{checkinCount}</p>
          <p className="text-[10.5px] font-bold text-muted">Check-ins</p>
        </a>
        <div className="rounded-xl bg-card px-2.5 py-2.5">
          <p className="font-heading text-lg font-extrabold text-brand-purple">{points}</p>
          <p className="text-[10.5px] font-bold text-muted">Points</p>
        </div>
      </div>
    </div>
  );
}
