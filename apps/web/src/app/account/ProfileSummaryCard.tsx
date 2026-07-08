import type { AppUser } from "@blockwise/types";
import { Avatar } from "../Avatar";

// BACKLOG.md Ref 47: profile summary card at the top of the account page --
// avatar, activity counts, and points total, each count linking down to its
// full list section further down this same page.
export function ProfileSummaryCard({
  user,
  favoriteCount,
  checkinCount,
  points,
}: {
  user: AppUser;
  favoriteCount: number;
  checkinCount: number;
  points: number;
}) {
  const label = user.display_name ?? user.username ?? user.email ?? "You";

  return (
    <div className="flex items-center gap-4 rounded-lg border border-black/[.08] px-4 py-4 dark:border-white/[.145]">
      <Avatar avatarUrl={user.avatar_url} label={label} size={56} />
      <div className="flex flex-col gap-1">
        <span className="font-medium text-black dark:text-zinc-50">{label}</span>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <a href="#favorites" className="text-zinc-600 hover:underline dark:text-zinc-400">
            {favoriteCount} favorite{favoriteCount === 1 ? "" : "s"}
          </a>
          <a href="#checkins" className="text-zinc-600 hover:underline dark:text-zinc-400">
            {checkinCount} check-in{checkinCount === 1 ? "" : "s"}
          </a>
          <span className="text-zinc-600 dark:text-zinc-400">{points} points</span>
        </div>
      </div>
    </div>
  );
}
