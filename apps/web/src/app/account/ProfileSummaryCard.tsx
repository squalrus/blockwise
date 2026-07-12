import type { AppUser, UserPointsSummary } from "@blockwise/types";
import { Avatar } from "../Avatar";
import { MushroomField } from "../MushroomField";
import { ProgressBar } from "../ProgressBar";

// BACKLOG.md Ref 47: profile summary card at the top of the account page --
// avatar, level/points progress, and activity counts. Favorites/Check-ins/
// Badges each link down to their full list section further down this same
// page; Points and Challenges have no section of their own to jump to, so
// those two stay plain (non-link) tiles. Level is computed server-side
// (GET /me/points, apps/api's gamification/points.ts computeLevel) rather
// than here, so it agrees with the badge rule engine's "level_reached"
// badges, which need the same number.
export function ProfileSummaryCard({
  user,
  favoriteCount,
  checkinCount,
  pointsSummary,
  badgeCount,
  challengeCount,
}: {
  user: AppUser;
  favoriteCount: number;
  checkinCount: number;
  pointsSummary: UserPointsSummary;
  badgeCount: number;
  challengeCount: number;
}) {
  const label = user.display_name ?? user.username ?? user.email ?? "You";
  const { points, level, points_into_level: pointsIntoLevel, points_to_next_level: pointsToNext } = pointsSummary;
  const percent = (pointsIntoLevel / (pointsIntoLevel + pointsToNext)) * 100;

  return (
    <div className="flex flex-col gap-4 overflow-hidden rounded-2xl bg-card-alt px-5 pt-4 pb-6">
      <div className="flex items-center gap-3.5">
        <Avatar avatarUrl={user.avatar_url} avatarStyle={user.avatar_style} seed={user.id} label={label} size={56} />
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

      <div className="grid grid-cols-5 gap-2 text-center">
        <a href="#favorites" className="rounded-xl bg-card px-1.5 py-2.5">
          <p className="font-heading text-lg font-extrabold text-brand-orange">{favoriteCount}</p>
          <p className="text-[10.5px] font-bold text-muted">Favorites</p>
        </a>
        <a href="#checkins" className="rounded-xl bg-card px-1.5 py-2.5">
          <p className="font-heading text-lg font-extrabold text-brand-green">{checkinCount}</p>
          <p className="text-[10.5px] font-bold text-muted">Check-ins</p>
        </a>
        <div className="rounded-xl bg-card px-1.5 py-2.5">
          <p className="font-heading text-lg font-extrabold text-brand-purple">{points}</p>
          <p className="text-[10.5px] font-bold text-muted">Points</p>
        </div>
        <a href="#badges" className="rounded-xl bg-card px-1.5 py-2.5">
          <p className="font-heading text-lg font-extrabold text-brand-amber">{badgeCount}</p>
          <p className="text-[10.5px] font-bold text-muted">Badges</p>
        </a>
        <div className="rounded-xl bg-card px-1.5 py-2.5">
          <p className="font-heading text-lg font-extrabold text-brand-orange">{challengeCount}</p>
          <p className="text-[10.5px] font-bold text-muted">Challenges</p>
        </div>
      </div>

      {/* Every user's mushroom "skin" grows here regardless of whether
          they've set it as their actual avatar image, so it stays a visible
          part of their identity either way -- derived from the id for now
          (a future mushroom editor will let a user override this with a
          stored choice instead of this default). */}
      <MushroomField seed={user.id} count={level} ariaLabel={`Level ${level}`} />
    </div>
  );
}
