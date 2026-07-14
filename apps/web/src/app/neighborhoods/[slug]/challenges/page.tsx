import type { Metadata } from "next";
import type { LeaderboardEntry } from "@blockwise/types";
import { apiUrl } from "@/lib/api";
import { ChallengesView } from "../ChallengesView";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return { alternates: { canonical: `/neighborhoods/${slug}/challenges` } };
}

async function getLeaderboard(slug: string): Promise<LeaderboardEntry[]> {
  const res = await fetch(apiUrl(`/neighborhoods/${slug}/leaderboard`), { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load leaderboard for neighborhood ${slug}: ${res.status}`);
  return (await res.json()) as LeaderboardEntry[];
}

// BACKLOG.md Ref 27: Challenges tab -- challenges on top, leaderboard below,
// merged from what were previously two separate tabs.
export default async function NeighborhoodChallengesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const leaderboard = await getLeaderboard(slug);

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h2 className="font-heading text-lg font-extrabold text-foreground">Challenges</h2>
        <ChallengesView neighborhoodSlug={slug} />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-heading text-lg font-extrabold text-foreground">Leaderboard</h2>
        {leaderboard.length === 0 ? (
          <p className="text-sm text-muted">No leaderboard activity yet.</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {leaderboard.map((entry) => {
              const isTop = entry.rank === 1;
              return (
                <li
                  key={entry.user_id}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm ${
                    isTop ? "bg-nav" : "bg-card-alt opacity-90"
                  }`}
                >
                  <span
                    className={`w-6 font-heading text-base font-extrabold ${
                      isTop ? "text-brand-amber" : "text-muted"
                    }`}
                  >
                    #{entry.rank}
                  </span>
                  <span
                    className={`flex-1 font-extrabold ${isTop ? "text-nav-foreground" : "text-muted"}`}
                  >
                    {entry.display_name ?? entry.username ?? "Neighbor"}
                  </span>
                  <span
                    className={`font-heading font-extrabold ${isTop ? "text-brand-amber" : "text-muted"}`}
                  >
                    {entry.points} pts
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
