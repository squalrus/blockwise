import type { LeaderboardEntry } from "@blockwise/types";
import { apiUrl } from "@/lib/api";

async function getLeaderboard(slug: string): Promise<LeaderboardEntry[]> {
  const res = await fetch(apiUrl(`/neighborhoods/${slug}/leaderboard`), { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load leaderboard for neighborhood ${slug}: ${res.status}`);
  return (await res.json()) as LeaderboardEntry[];
}

// BACKLOG.md Ref 44: Leaderboard tab, the default route for the neighborhood
// profile (see NeighborhoodTabs.tsx).
export default async function NeighborhoodLeaderboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const leaderboard = await getLeaderboard(slug);

  if (leaderboard.length === 0) {
    return <p className="text-sm text-zinc-600 dark:text-zinc-400">No leaderboard activity yet.</p>;
  }

  return (
    <ol className="flex flex-col gap-2">
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
  );
}
