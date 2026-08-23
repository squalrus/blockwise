import Link from "next/link";
import type { ActivityItem, AppUser, PublicUserProfile } from "@blockwise/types";
import { ProfileSummaryCard } from "../../../account/ProfileSummaryCard";
import { ActivityFeed } from "../../../ActivityFeed";
import { JoinNeighborhoodButton } from "../../../neighborhoods/[slug]/JoinNeighborhoodButton";
import { BadgesSection } from "../../../profile/[username]/BadgesSection";
import { ChallengesSection } from "../../../profile/[username]/ChallengesSection";
import { NeighborRequestButton } from "../../../profile/[username]/NeighborRequestButton";
import { TopCapsSection } from "../../../profile/[username]/TopCapsSection";
import { SAMPLE_PROFILE } from "../demoData";

// Mirrors toCheckinActivity in profile/[username]/page.tsx.
function toCheckinActivity(profile: PublicUserProfile): ActivityItem[] {
  return profile.recent_checkins.map((checkin, index): ActivityItem => ({
    id: `${checkin.venue_id}-${checkin.checked_in_at}-${index}`,
    type: "checkin",
    actor_name: profile.display_name ?? profile.username,
    actor_username: profile.username,
    venue_id: checkin.venue_id,
    venue_name: checkin.name,
    badge_name: null,
    badge_icon: null,
    challenge_title: null,
    event_id: null,
    event_title: null,
    other_user_name: null,
    other_user_username: null,
    points_earned: null,
    occurred_at: checkin.checked_in_at,
  }));
}

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
    notification_preferences: {
      checkins: true,
      connection_requests: true,
      connection_accepted: true,
      event_reminders: true,
      new_coupons: true,
    },
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

        <TopCapsSection topCaps={profile.top_caps} />

        <section className="flex flex-col gap-2.5">
          <h2 className="text-xs font-extrabold tracking-wide text-muted uppercase">Badges</h2>
          <BadgesSection badges={profile.badges} />
        </section>

        <section className="flex flex-col gap-2.5">
          <h2 className="text-xs font-extrabold tracking-wide text-muted uppercase">Challenges</h2>
          <ChallengesSection challenges={profile.challenges} />
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
          <ActivityFeed items={toCheckinActivity(profile)} emptyMessage="No check-ins yet." />
        </section>
      </div>
    </section>
  );
}
