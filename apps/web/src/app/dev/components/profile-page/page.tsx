import Link from "next/link";
import type { AppUser, PublicUserProfile } from "@blockwise/types";
import { ProfileSummaryCard } from "../../../account/ProfileSummaryCard";
import { BadgeIcon } from "../../../BadgeIcon";
import { CheckinTimeline } from "../../../CheckinTimeline";
import { JoinNeighborhoodButton } from "../../../neighborhoods/[slug]/JoinNeighborhoodButton";
import { NeighborRequestButton } from "../../../profile/[username]/NeighborRequestButton";
import { SAMPLE_PROFILE } from "../demoData";

// Mirrors toCardUser in profile/[username]/page.tsx -- a public profile only
// ever exposes this subset of AppUser, so the card is fed the same
// placeholder-filled shape here.
function toCardUser(profile: PublicUserProfile): AppUser {
  return {
    id: profile.username,
    account_type: "consumer",
    email: null,
    display_name: profile.display_name,
    avatar_url: profile.avatar_url,
    avatar_style: profile.avatar_style,
    mushroom_customization: profile.mushroom_customization,
    username: profile.username,
    visibility: "public",
    created_at: profile.joined_at,
    is_neighborhood_admin: false,
    is_super_admin: false,
  };
}

// Full sample public profile page, mirroring /profile/[username]/page.tsx.
// Renders the badges/challenges/neighborhoods/check-ins sections directly
// rather than through ProfileDetails, whose neighbor-connection gate does a
// live fetch and would otherwise hide all of it behind a signed-out "add
// this person as a neighbor" message here.
export default function ProfilePageDemoPage() {
  const profile = SAMPLE_PROFILE;

  return (
    <section className="flex flex-col gap-5">
      <div>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground">Profile page</h1>
        <p className="mt-1 text-sm text-muted">A full sample user profile page, as rendered on /profile/[username].</p>
      </div>

      <div className="flex flex-col gap-6 rounded-3xl border border-border bg-card p-4">
        <div className="flex flex-col gap-1.5">
          <ProfileSummaryCard
            user={toCardUser(profile)}
            collectionCount={profile.collection_count}
            checkinCount={profile.checkin_count}
            pointsSummary={profile.points_summary}
            badgeCount={profile.badges.length}
            challengeCount={profile.challenges.length}
            neighborCount={profile.neighbor_count}
            neighborMushrooms={profile.neighbor_mushrooms}
            action={<NeighborRequestButton username={profile.username} mockNeighborState="none" />}
          />
          <p className="px-1 text-sm text-muted">
            @{profile.username} · Joined {new Date(profile.joined_at).toLocaleDateString()}
          </p>
        </div>

        <section className="flex flex-col gap-2.5">
          <h2 className="text-xs font-extrabold tracking-wide text-muted uppercase">Latest badge</h2>
          {profile.badges.length === 0 ? (
            <p className="text-sm text-muted">No badges earned yet.</p>
          ) : (
            (() => {
              const latest = profile.badges[0];
              return (
                <div className="flex items-center gap-3 rounded-2xl bg-card-alt px-4 py-3.5">
                  <span className="flex h-13 w-13 shrink-0 items-center justify-center rounded-full border-[3px] border-foreground bg-brand-purple text-2xl">
                    <BadgeIcon icon={latest.badge.icon} name={latest.badge.name} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold text-foreground">{latest.badge.name}</p>
                    {latest.badge.description && (
                      <p className="mt-0.5 text-xs text-body-text">{latest.badge.description}</p>
                    )}
                    <p className="mt-1 text-[11px] font-bold text-muted">
                      Unlocked {new Date(latest.awarded_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })()
          )}
        </section>

        <section className="flex flex-col gap-2.5">
          <h2 className="text-xs font-extrabold tracking-wide text-muted uppercase">Latest challenge</h2>
          {profile.challenges.length === 0 ? (
            <p className="text-sm text-muted">No challenges completed yet.</p>
          ) : (
            (() => {
              const latest = profile.challenges[0];
              return (
                <div className="rounded-2xl bg-card-alt px-4 py-3.5 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="font-extrabold text-foreground">{latest.title}</span>
                      {latest.description && <p className="mt-1 text-body-text">{latest.description}</p>}
                    </div>
                    {latest.badge && (
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-foreground bg-brand-purple text-lg">
                        <BadgeIcon icon={latest.badge.icon} name={latest.badge.name} />
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-xs font-bold text-muted">
                    {latest.neighborhood_name} · +{latest.points_reward} pts · Completed{" "}
                    {new Date(latest.completed_at).toLocaleString()}
                  </p>
                </div>
              );
            })()
          )}
        </section>

        <section className="flex flex-col gap-2.5">
          <h2 className="text-xs font-extrabold tracking-wide text-muted uppercase">Neighborhoods</h2>
          {profile.neighborhoods.length === 0 ? (
            <p className="text-sm text-muted">No neighborhoods joined yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {profile.neighborhoods.map((n) => (
                <li
                  key={n.neighborhood_id}
                  className="flex items-center justify-between gap-2 rounded-2xl bg-card-alt px-4 py-3 text-sm"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/neighborhoods/${n.slug}`}
                      className="font-extrabold text-foreground hover:text-brand-purple"
                    >
                      {n.name}
                    </Link>
                    <p className="text-muted">
                      {n.city}, {n.state}
                    </p>
                  </div>
                  <JoinNeighborhoodButton neighborhoodId={n.neighborhood_id} mockJoined />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-2.5">
          <h2 className="text-xs font-extrabold tracking-wide text-muted uppercase">Recent check-ins</h2>
          <CheckinTimeline checkins={profile.recent_checkins} emptyMessage="No check-ins yet." />
        </section>
      </div>
    </section>
  );
}
