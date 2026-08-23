import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { ActivityItem, AppUser, PublicUserProfile } from "@blockwise/types";
import { apiUrl } from "@/lib/api";
import { ProfileSummaryCard } from "../../account/ProfileSummaryCard";
import { ActivityFeed } from "../../ActivityFeed";
import { JoinNeighborhoodButton } from "../../neighborhoods/[slug]/JoinNeighborhoodButton";
import { BadgesSection } from "./BadgesSection";
import { ChallengesSection } from "./ChallengesSection";
import { NeighborRequestButton } from "./NeighborRequestButton";
import { ProfileDetails } from "./ProfileDetails";
import { ShareProfileButton } from "./ShareProfileButton";
import { TopCapsSection } from "./TopCapsSection";

// Adapts recent_checkins (CheckinHistoryItem[] -- venue_id/name/address/
// checked_in_at, no actor info of its own since it's always this profile's
// owner) into ActivityItem[] so this section can reuse ActivityFeed's
// day-grouped, avatar-per-row layout instead of the older dot-and-line
// Timeline/CheckinTimeline -- every other chronological feed in the app
// (neighborhood Spore feed, /account's Spore Feed and My Activity tabs)
// already reads this way; the profile page was the one holdout. The
// synthesized id mirrors CheckinTimeline's own key composition (no id field
// on CheckinHistoryItem itself); every field ActivityFeed doesn't use for a
// "checkin" row (badge/challenge/event/other-user) is null.
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
    // Not backed by a real point_event row here (recent_checkins is a plain
    // CheckinHistoryItem[], see above) -- awardCheckinRewards doesn't
    // *always* award CHECKIN_POINTS (e.g. a venue with no resolved
    // neighborhood context earns nothing), so this stays unknown rather than
    // assuming the flat rate applied.
    points_earned: null,
    occurred_at: checkin.checked_in_at,
  }));
}

// ProfileSummaryCard takes a full AppUser, but a public profile only ever
// exposes username/display_name/avatar_url/avatar_style/mushroom_customization
// -- the rest are
// placeholders the card never reads (it only touches those plus the
// display_name/username/email fallback chain for its label, and this
// profile always has a username since GET /users/:username 404s
// otherwise). id doubles as the mushroom seed here, so it's set to the
// public username rather than the real internal id (not exposed publicly)
// -- still stable and unique, just not the same value account/dev-page
// mushrooms for this user are seeded from.
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

async function getProfile(username: string): Promise<PublicUserProfile | null> {
  const res = await fetch(apiUrl(`/users/${username}`), { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load profile ${username}: ${res.status}`);
  return (await res.json()) as PublicUserProfile;
}

// Deliberately noindex by default (BACKLOG.md Ref 70's open question):
// "public visibility" means viewable by anyone with the link, not "opted
// into search indexing" -- most of the page's content is gated behind an
// accepted neighbor connection anyway (see ProfileDetails), so there's
// little for a search engine to index besides the summary card. Revisit if
// users ask for their profile to be discoverable via search.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const profile = await getProfile(username);
  if (!profile) return {};

  return {
    title: `${profile.display_name ?? profile.username} (@${profile.username}) — Spored`,
    alternates: { canonical: `/profile/${profile.username}` },
    robots: { index: false, follow: true },
  };
}

// Public user profiles (BACKLOG.md Ref 37): the profile-page counterpart to
// the self-only /account page -- only ever reachable for a public-visibility
// account with a username set (GET /users/:username 404s otherwise, so a
// private profile isn't distinguishable from a nonexistent one here either).
export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profile = await getProfile(username);

  if (!profile) notFound();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 font-sans sm:p-16">
      <Link href="/" className="text-sm font-bold text-brand-purple hover:text-brand-orange">
        ← Home
      </Link>

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
          action={
            <div className="flex items-center gap-2">
              <ShareProfileButton username={profile.username} />
              <NeighborRequestButton username={profile.username} />
            </div>
          }
        />
        <p className="px-1 text-sm text-muted">
          @{profile.username} · Joined {new Date(profile.joined_at).toLocaleDateString()}
        </p>
      </div>

      <ProfileDetails username={profile.username}>
        <TopCapsSection topCaps={profile.top_caps} />

        <section id="badges" className="flex flex-col gap-2.5 scroll-mt-16">
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
                  <JoinNeighborhoodButton neighborhoodId={n.neighborhood_id} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section id="checkins" className="flex flex-col gap-2.5 scroll-mt-16">
          <h2 className="text-xs font-extrabold tracking-wide text-muted uppercase">Recent check-ins</h2>
          <ActivityFeed items={toCheckinActivity(profile)} emptyMessage="No check-ins yet." />
        </section>
      </ProfileDetails>
    </div>
  );
}
