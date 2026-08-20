import type { ReactNode } from "react";
import Link from "next/link";
import type { AppUser, MushroomConfig, UserPointsSummary } from "@blockwise/types";
import { Avatar } from "../Avatar";
import { MushroomField } from "../MushroomField";
import { ProgressBar } from "../ProgressBar";

// BACKLOG.md Ref 47: profile summary card at the top of the account page --
// avatar, level/points progress, and activity counts. Collection/Check-ins/
// Badges/Challenges/Neighbors each link to their matching /account/* tab
// when linkToAccountTabs is set (the account page's own layout.tsx passes
// it; the public profile page doesn't, since its tiles show *someone else's*
// counts -- a tile there linking to your own /account/collection would be
// showing their number but navigating to your data). Points has no matching
// tab (level/points already live in this same card's header/progress bar
// above), so it never links. Level is computed server-side
// (GET /me/points, apps/api's gamification/points.ts computeLevel) rather
// than here, so it agrees with the badge rule engine's "level_reached"
// badges, which need the same number. `action` is an optional upper-right
// slot (BACKLOG.md Ref 14/33) -- the public profile page uses it for a
// NeighborRequestButton, mirroring JoinNeighborhoodButton's placement on a
// neighborhood profile; the account page (viewing your own card) uses it for
// a "View public" link to the same public-visibility/username gate the
// ProfileForm settings link already uses (unset entirely otherwise, same as
// a private or username-less account viewing its own card).
// href unset (Points, or any tile when linkToAccountTabs is false) renders
// a plain div; otherwise a Link to that stat's own /account/* tab.
function StatTile({ value, label, accent, href }: { value: number; label: string; accent: string; href?: string }) {
  const content = (
    <>
      <p className={`font-heading text-lg font-extrabold ${accent}`}>{value}</p>
      <p className="text-[10.5px] font-bold text-muted">{label}</p>
    </>
  );

  if (!href) {
    return <div className="rounded-xl bg-card px-1.5 py-2.5">{content}</div>;
  }

  return (
    <Link href={href} className="rounded-xl bg-card px-1.5 py-2.5 transition-opacity hover:opacity-80 active:opacity-70">
      {content}
    </Link>
  );
}

export function ProfileSummaryCard({
  user,
  collectionCount,
  checkinCount,
  pointsSummary,
  badgeCount,
  challengeCount,
  neighborCount,
  neighborMushrooms = [],
  action,
  linkToAccountTabs = false,
}: {
  user: AppUser;
  collectionCount: number;
  checkinCount: number;
  pointsSummary: UserPointsSummary;
  badgeCount: number;
  challengeCount: number;
  neighborCount: number;
  // BACKLOG.md Ref 97 "Profile card: live, one-to-one neighbor mushrooms" --
  // each accepted neighbor's current live look, merged into the card's own
  // mushroom field below (rather than a separate "Neighbors" field/card) so
  // one field reads as both "my own growth" (level) and "my reach with
  // others" (one mushroom per neighbor). Optional since a brand-new
  // account/profile has none yet.
  neighborMushrooms?: MushroomConfig[];
  action?: ReactNode;
  linkToAccountTabs?: boolean;
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
        <StatTile value={collectionCount} label="Collection" accent="text-brand-orange" href={linkToAccountTabs ? "/account/collection" : undefined} />
        <StatTile value={checkinCount} label="Check-ins" accent="text-brand-green" href={linkToAccountTabs ? "/account/activity" : undefined} />
        <StatTile value={points} label="Points" accent="text-brand-purple" />
        <StatTile value={badgeCount} label="Badges" accent="text-brand-amber" href={linkToAccountTabs ? "/account/badges" : undefined} />
        <StatTile value={challengeCount} label="Challenges" accent="text-brand-orange" href={linkToAccountTabs ? "/account/challenges" : undefined} />
        <StatTile value={neighborCount} label="Neighbors" accent="text-brand-purple" href={linkToAccountTabs ? "/account/neighbors" : undefined} />
      </div>

      {/* Merged field (BACKLOG.md "how strong their presence is within the
          neighborhood(s) plus their reach with others"): the leading `level`
          mushrooms are the account's own skin -- regardless of whether
          they've set it as their actual avatar image, so it stays a visible
          part of their identity either way (the saved customizer choice,
          BACKLOG.md Ref 75, if any, else derived from the id) -- followed by
          one live mushroom per accepted neighbor (BACKLOG.md Ref 97),
          truncating at MushroomField's MAX_MUSHROOMS cap rather than
          compressing for a very highly-connected account. */}
      <MushroomField
        seed={user.id}
        count={level + neighborCount}
        ariaLabel={`Level ${level} · ${neighborCount} neighbors`}
        customization={user.mushroom_customization}
        distinctMushrooms
        ownCount={level}
        mushrooms={neighborMushrooms}
        mayorLabel={user.display_name ?? user.username}
      />
    </div>
  );
}
