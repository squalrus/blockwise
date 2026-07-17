import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { AppUser, PublicUserProfile } from "@blockwise/types";
import { apiUrl } from "@/lib/api";
import { ProfileSummaryCard } from "../../account/ProfileSummaryCard";
import { BadgeIcon } from "../../BadgeIcon";
import { CheckinTimeline } from "../../CheckinTimeline";
import { JoinNeighborhoodButton } from "../../neighborhoods/[slug]/JoinNeighborhoodButton";
import { NeighborRequestButton } from "./NeighborRequestButton";
import { ProfileDetails } from "./ProfileDetails";

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
    phone: null,
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
          favoriteCount={profile.favorite_count}
          checkinCount={profile.checkin_count}
          pointsSummary={profile.points_summary}
          badgeCount={profile.badges.length}
          challengeCount={profile.challenges.length}
          neighborCount={profile.neighbor_count}
          neighborMushrooms={profile.neighbor_mushrooms}
          action={<NeighborRequestButton username={profile.username} />}
        />
        <p className="px-1 text-sm text-muted">
          @{profile.username} · Joined {new Date(profile.joined_at).toLocaleDateString()}
        </p>
      </div>

      <ProfileDetails username={profile.username}>
        <section id="badges" className="flex flex-col gap-2.5 scroll-mt-16">
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
                  <JoinNeighborhoodButton neighborhoodId={n.neighborhood_id} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section id="checkins" className="flex flex-col gap-2.5 scroll-mt-16">
          <h2 className="text-xs font-extrabold tracking-wide text-muted uppercase">Recent check-ins</h2>
          <CheckinTimeline checkins={profile.recent_checkins} emptyMessage="No check-ins yet." />
        </section>
      </ProfileDetails>
    </div>
  );
}
