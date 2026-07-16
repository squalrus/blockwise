import type { ReactNode } from "react";
import type { AppUser, MushroomSnapshot, UserPointsSummary } from "@blockwise/types";
import { Avatar } from "../Avatar";
import { MushroomField } from "../MushroomField";
import { ProgressBar } from "../ProgressBar";

// BACKLOG.md Ref 47: profile summary card at the top of the account page --
// avatar, level/points progress, and activity counts. Every stat is a
// plain, non-interactive tile -- the account page's Favorites/Check-ins/
// Badges/Challenges/Neighbors sections are switched by the separate TabNav
// below this card, not by these tiles. Level is computed server-side
// (GET /me/points, apps/api's gamification/points.ts computeLevel) rather
// than here, so it agrees with the badge rule engine's "level_reached"
// badges, which need the same number. `action` is an optional upper-right
// slot (BACKLOG.md Ref 14/33) -- the public profile page uses it for a
// NeighborRequestButton, mirroring JoinNeighborhoodButton's placement on a
// neighborhood profile; the account page (viewing your own card) uses it for
// a "View public" link to the same public-visibility/username gate the
// ProfileForm settings link already uses (unset entirely otherwise, same as
// a private or username-less account viewing its own card).
export function ProfileSummaryCard({
  user,
  favoriteCount,
  checkinCount,
  pointsSummary,
  badgeCount,
  challengeCount,
  neighborCount,
  neighborMushrooms = [],
  action,
}: {
  user: AppUser;
  favoriteCount: number;
  checkinCount: number;
  pointsSummary: UserPointsSummary;
  badgeCount: number;
  challengeCount: number;
  neighborCount: number;
  // BACKLOG.md "Mushroom fingerprint stamps on connections and check-ins" --
  // real neighbor mushroom snapshots, most-recent-first, merged into the
  // card's own mushroom field below (rather than a separate "Neighbors"
  // field/card) so one field reads as both "my own growth" (level) and "my
  // reach with others" (neighbor stamps). Optional since a brand-new
  // account/profile has none yet.
  neighborMushrooms?: MushroomSnapshot[];
  action?: ReactNode;
}) {
  const label = user.display_name ?? user.username ?? user.email ?? "You";
  const { points, level, points_into_level: pointsIntoLevel, points_to_next_level: pointsToNext } = pointsSummary;
  const percent = (pointsIntoLevel / (pointsIntoLevel + pointsToNext)) * 100;

  return (
    <div className="flex flex-col gap-4 overflow-hidden rounded-2xl bg-card-alt px-5 pt-4 pb-6">
      <div className="flex items-start justify-between gap-3.5">
        <div className="flex items-center gap-3.5">
          <Avatar
            avatarUrl={user.avatar_url}
            avatarStyle={user.avatar_style}
            mushroomCustomization={user.mushroom_customization}
            seed={user.id}
            label={label}
            size={56}
          />
          <div>
            <span className="font-heading text-xl font-extrabold text-foreground">{label}</span>
            <p className="mt-0.5 text-xs font-bold text-muted">
              Level {level} forager · {points} pts
            </p>
          </div>
        </div>
        {action}
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

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-card px-1.5 py-2.5">
          <p className="font-heading text-lg font-extrabold text-brand-orange">{favoriteCount}</p>
          <p className="text-[10.5px] font-bold text-muted">Favorites</p>
        </div>
        <div className="rounded-xl bg-card px-1.5 py-2.5">
          <p className="font-heading text-lg font-extrabold text-brand-green">{checkinCount}</p>
          <p className="text-[10.5px] font-bold text-muted">Check-ins</p>
        </div>
        <div className="rounded-xl bg-card px-1.5 py-2.5">
          <p className="font-heading text-lg font-extrabold text-brand-purple">{points}</p>
          <p className="text-[10.5px] font-bold text-muted">Points</p>
        </div>
        <div className="rounded-xl bg-card px-1.5 py-2.5">
          <p className="font-heading text-lg font-extrabold text-brand-amber">{badgeCount}</p>
          <p className="text-[10.5px] font-bold text-muted">Badges</p>
        </div>
        <div className="rounded-xl bg-card px-1.5 py-2.5">
          <p className="font-heading text-lg font-extrabold text-brand-orange">{challengeCount}</p>
          <p className="text-[10.5px] font-bold text-muted">Challenges</p>
        </div>
        <div className="rounded-xl bg-card px-1.5 py-2.5">
          <p className="font-heading text-lg font-extrabold text-brand-purple">{neighborCount}</p>
          <p className="text-[10.5px] font-bold text-muted">Neighbors</p>
        </div>
      </div>

      {/* Merged field (BACKLOG.md "how strong their presence is within the
          neighborhood(s) plus their reach with others"): the leading `level`
          mushrooms are the account's own skin -- regardless of whether
          they've set it as their actual avatar image, so it stays a visible
          part of their identity either way (the saved customizer choice,
          BACKLOG.md Ref 75, if any, else derived from the id) -- followed by
          a mosaic of real neighbor mushroom stamps, one per accepted
          neighbor (sqrt-scaled like the venue/neighborhood check-in fields
          so a highly-connected account doesn't instantly max out the cap). */}
      <MushroomField
        seed={user.id}
        count={level + Math.sqrt(neighborCount)}
        ariaLabel={`Level ${level} · ${neighborCount} neighbors`}
        customization={user.mushroom_customization}
        distinctMushrooms
        ownCount={level}
        mushrooms={neighborMushrooms}
      />
    </div>
  );
}
