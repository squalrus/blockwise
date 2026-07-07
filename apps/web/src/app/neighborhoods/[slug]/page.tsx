import Link from "next/link";
import { notFound } from "next/navigation";
import type {
  Event,
  LeaderboardEntry,
  NeighborhoodProfile,
  SocialLinks,
  VenueListItem,
} from "@blockwise/types";
import { apiUrl } from "@/lib/api";
import { CheckInButton } from "../../venues/[id]/CheckInButton";
import { ChallengesView } from "./ChallengesView";
import { JoinNeighborhoodButton } from "./JoinNeighborhoodButton";
import { VenuesView } from "./VenuesView";

const SOCIAL_PLATFORM_LABELS: { key: keyof SocialLinks; label: string }[] = [
  { key: "instagram", label: "Instagram" },
  { key: "twitter", label: "Twitter / X" },
  { key: "tiktok", label: "TikTok" },
  { key: "facebook", label: "Facebook" },
  { key: "website", label: "Website" },
];

async function getNeighborhood(slug: string): Promise<NeighborhoodProfile | null> {
  const res = await fetch(apiUrl(`/neighborhoods/${slug}`), { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load neighborhood ${slug}: ${res.status}`);
  return (await res.json()) as NeighborhoodProfile;
}

async function getEvents(id: string): Promise<Event[]> {
  const res = await fetch(apiUrl(`/neighborhoods/${id}/events`), { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load events for neighborhood ${id}: ${res.status}`);
  return (await res.json()) as Event[];
}

async function getVenues(id: string): Promise<VenueListItem[]> {
  const res = await fetch(apiUrl(`/neighborhoods/${id}/venues`), { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load venues for neighborhood ${id}: ${res.status}`);
  return (await res.json()) as VenueListItem[];
}

async function getLeaderboard(slug: string): Promise<LeaderboardEntry[]> {
  const res = await fetch(apiUrl(`/neighborhoods/${slug}/leaderboard`), { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load leaderboard for neighborhood ${slug}: ${res.status}`);
  return (await res.json()) as LeaderboardEntry[];
}

// Neighborhood profile pages (BACKLOG.md): the neighborhood-scoped equivalent
// of the venue detail page (venues/[id]/page.tsx) -- a description, upcoming
// events, and neighborhood-owned POIs (parks, transit, landmarks not tied to
// any single venue). Authoring happens from /neighborhood-admin/[id].
export default async function NeighborhoodProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const neighborhood = await getNeighborhood(slug);

  if (!neighborhood) notFound();

  const [events, venues, leaderboard] = await Promise.all([
    getEvents(neighborhood.id),
    getVenues(neighborhood.id),
    getLeaderboard(neighborhood.slug),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-16 font-sans">
      <Link href="/" className="text-sm text-zinc-600 hover:underline dark:text-zinc-400">
        ← All neighborhoods
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
            {neighborhood.name}
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {neighborhood.city}, {neighborhood.state}
          </p>
        </div>
        <JoinNeighborhoodButton neighborhoodId={neighborhood.id} />
      </div>

      {neighborhood.description && (
        <p className="text-sm text-zinc-700 dark:text-zinc-300">{neighborhood.description}</p>
      )}

      {Object.keys(neighborhood.social_links).length > 0 && (
        <div className="flex flex-wrap gap-4 text-sm">
          {SOCIAL_PLATFORM_LABELS.filter(({ key }) => neighborhood.social_links[key]).map(
            ({ key, label }) => (
              <a
                key={key}
                href={neighborhood.social_links[key]}
                target="_blank"
                rel="noreferrer"
                className="text-zinc-600 underline hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50"
              >
                {label}
              </a>
            )
          )}
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Venues</h2>
        <div className="mt-2">
          <VenuesView venues={venues} />
        </div>
      </div>

      {events.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Upcoming events</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {events.map((e) => (
              <li
                key={e.id}
                className="rounded-lg border border-black/[.08] px-4 py-3 text-sm dark:border-white/[.145]"
              >
                <span className="font-medium text-black dark:text-zinc-50">{e.title}</span>
                <p className="mt-1 text-zinc-600 dark:text-zinc-400">{e.description}</p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                  {new Date(e.start_time).toLocaleString()} – {new Date(e.end_time).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {neighborhood.pois.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
            Points of interest
          </h2>
          <ul className="mt-2 flex flex-col gap-3">
            {neighborhood.pois.map((poi) => (
              <li
                key={poi.id}
                className="rounded-lg border border-black/[.08] px-4 py-3 text-sm dark:border-white/[.145]"
              >
                <span className="font-medium text-black dark:text-zinc-50">{poi.name}</span>
                <span className="ml-2 text-zinc-600 dark:text-zinc-400">{poi.type}</span>
                {poi.description && (
                  <p className="mt-1 text-zinc-600 dark:text-zinc-400">{poi.description}</p>
                )}
                <div className="mt-2">
                  <CheckInButton target={{ type: "poi", id: poi.id }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ChallengesView neighborhoodSlug={neighborhood.slug} />

      {leaderboard.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Leaderboard</h2>
          <ol className="mt-2 flex flex-col gap-2">
            {leaderboard.map((entry) => (
              <li
                key={entry.user_id}
                className="flex items-center justify-between rounded-lg border border-black/[.08] px-4 py-3 text-sm dark:border-white/[.145]"
              >
                <span className="text-black dark:text-zinc-50">
                  <span className="mr-2 text-zinc-500 dark:text-zinc-500">#{entry.rank}</span>
                  {entry.display_name ?? entry.username ?? "Neighbor"}
                </span>
                <span className="font-medium text-black dark:text-zinc-50">{entry.points}pts</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
