import Link from "next/link";
import { notFound } from "next/navigation";
import type { PublicUserProfile } from "@blockwise/types";
import { apiUrl } from "@/lib/api";
import { Avatar } from "../../Avatar";
import { BadgeIcon } from "../../BadgeIcon";
import { PlaceListItem } from "../../PlaceListItem";

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
      <Link href="/" className="text-sm text-zinc-600 hover:underline dark:text-zinc-400">
        ← Home
      </Link>

      <div className="flex items-center gap-4">
        <Avatar avatarUrl={profile.avatar_url} label={profile.display_name ?? profile.username} size={64} />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
            {profile.display_name ?? profile.username}
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            @{profile.username} · Joined {new Date(profile.joined_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Badges</h2>
        {profile.badges.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">No badges earned yet.</p>
        ) : (
          <ul className="mt-2 flex flex-wrap gap-3">
            {profile.badges.map((userBadge) => (
              <li
                key={userBadge.badge.id}
                className="flex flex-col items-center gap-1 rounded-lg border border-black/[.08] px-4 py-3 text-sm dark:border-white/[.145]"
              >
                <span className="text-2xl">
                  <BadgeIcon icon={userBadge.badge.icon} name={userBadge.badge.name} />
                </span>
                <span className="font-medium text-black dark:text-zinc-50">{userBadge.badge.name}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Neighborhoods</h2>
        {profile.neighborhoods.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">No neighborhoods joined yet.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {profile.neighborhoods.map((n) => (
              <li
                key={n.neighborhood_id}
                className="rounded-lg border border-black/[.08] px-4 py-3 text-sm dark:border-white/[.145]"
              >
                <Link
                  href={`/neighborhoods/${n.slug}`}
                  className="font-medium text-black hover:underline dark:text-zinc-50"
                >
                  {n.name}
                </Link>
                <p className="text-zinc-600 dark:text-zinc-400">
                  {n.city}, {n.state}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Recent check-ins</h2>
        {profile.recent_checkins.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">No check-ins yet.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {profile.recent_checkins.map((checkin, index) => (
              <li key={`${checkin.venue_id}-${checkin.checked_in_at}-${index}`}>
                <PlaceListItem
                  href={`/venues/${checkin.venue_id}`}
                  id={checkin.venue_id}
                  name={checkin.name}
                  subtitle={new Date(checkin.checked_in_at).toLocaleString()}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
