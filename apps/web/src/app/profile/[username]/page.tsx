import Link from "next/link";
import { notFound } from "next/navigation";
import type { PublicUserProfile } from "@blockwise/types";
import { apiUrl } from "@/lib/api";
import { Avatar } from "../../Avatar";
import { BadgeIcon } from "../../BadgeIcon";
import { CheckinTimeline } from "../../CheckinTimeline";

async function getProfile(username: string): Promise<PublicUserProfile | null> {
  const res = await fetch(apiUrl(`/users/${username}`), { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load profile ${username}: ${res.status}`);
  return (await res.json()) as PublicUserProfile;
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

      <div className="flex items-center gap-4">
        <Avatar avatarUrl={profile.avatar_url} label={profile.display_name ?? profile.username} size={64} />
        <div>
          <h1 className="font-heading text-xl font-extrabold text-foreground">
            {profile.display_name ?? profile.username}
          </h1>
          <p className="text-sm text-muted">
            @{profile.username} · Joined {new Date(profile.joined_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      <section className="flex flex-col gap-2.5">
        <h2 className="text-xs font-extrabold tracking-wide text-muted uppercase">Badges</h2>
        {profile.badges.length === 0 ? (
          <p className="text-sm text-muted">No badges earned yet.</p>
        ) : (
          <ul className="flex flex-wrap gap-4">
            {profile.badges.map((userBadge) => (
              <li key={userBadge.badge.id} className="flex flex-col items-center gap-1.5 text-center">
                <span className="flex h-13 w-13 items-center justify-center rounded-full border-[3px] border-nav bg-brand-amber text-2xl">
                  <BadgeIcon icon={userBadge.badge.icon} name={userBadge.badge.name} />
                </span>
                <span className="max-w-16 text-[10.5px] font-extrabold text-foreground">
                  {userBadge.badge.name}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2.5">
        <h2 className="text-xs font-extrabold tracking-wide text-muted uppercase">Neighborhoods</h2>
        {profile.neighborhoods.length === 0 ? (
          <p className="text-sm text-muted">No neighborhoods joined yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {profile.neighborhoods.map((n) => (
              <li key={n.neighborhood_id} className="rounded-2xl bg-card-alt px-4 py-3 text-sm">
                <Link
                  href={`/neighborhoods/${n.slug}`}
                  className="font-extrabold text-foreground hover:text-brand-purple"
                >
                  {n.name}
                </Link>
                <p className="text-muted">
                  {n.city}, {n.state}
                </p>
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
  );
}
