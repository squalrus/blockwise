import type { Metadata } from "next";
import type { LeaderboardEntry, NeighborhoodProfile } from "@blockwise/types";
import { MushroomMark, mushroomConfigForUser } from "@blockwise/ui";
import { apiUrl } from "@/lib/api";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return { alternates: { canonical: `/neighborhoods/${slug}/leaderboard` } };
}

async function getNeighborhood(slug: string): Promise<NeighborhoodProfile | null> {
  const res = await fetch(apiUrl(`/neighborhoods/${slug}`), { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load neighborhood ${slug}: ${res.status}`);
  return (await res.json()) as NeighborhoodProfile;
}

async function getLeaderboard(slug: string): Promise<LeaderboardEntry[]> {
  const res = await fetch(apiUrl(`/neighborhoods/${slug}/leaderboard`), { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load leaderboard for neighborhood ${slug}: ${res.status}`);
  return (await res.json()) as LeaderboardEntry[];
}

// Rank 1-3 get a colored circle (gold/silver/bronze, matching the "Top Caps"
// badge cluster on the neighborhood header card); rank 4+ falls back to
// plain muted rank text -- the Lifetime points list can run long, and a wall
// of colored circles past the podium would just be noise (Top Caps is
// always podium-only, at most 3 entries).
const RANK_BADGE_CLASSES = ["bg-brand-amber", "bg-rank-silver", "bg-rank-bronze"];

// One row shared by both ranked lists below -- Top Caps (top_visitors) and
// Lifetime points (leaderboard) -- so the two read as the same visual
// language despite ranking by different metrics. `metric` is pre-formatted
// ("11 check-ins" / "940 pts") rather than a raw number, since the two
// lists' units differ.
function RankRow({ rank, avatarSeed, name, metric }: { rank: number; avatarSeed: string; name: string; metric: string }) {
  const isTop = rank === 1;
  const isPodium = rank <= 3;
  const avatarConfig = mushroomConfigForUser(avatarSeed);
  return (
    <li
      className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm ${
        isTop ? "bg-nav" : `bg-card-alt ${isPodium ? "" : "opacity-80"}`
      }`}
    >
      {isPodium ? (
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-heading text-xs font-extrabold text-ink ${RANK_BADGE_CLASSES[rank - 1]}`}
        >
          {rank}
        </span>
      ) : (
        <span className="w-6 shrink-0 text-center font-heading text-base font-extrabold text-muted">#{rank}</span>
      )}
      {/* Neither LeaderboardEntry nor TopVisitor carries the ranked user's
          real avatar/customization -- LeaderboardEntry has no
          mushroom_customization field, and TopVisitor has no seed beyond a
          username -- so, same precedent as ActivityFeed's ActorAvatar, this
          renders a stable deterministic look keyed off whatever public
          identifier is available. */}
      <span className="shrink-0">
        <MushroomMark {...avatarConfig} size={28} bg={avatarConfig.bg} />
      </span>
      <span
        className={`flex-1 font-extrabold ${isTop ? "text-nav-foreground" : isPodium ? "text-foreground" : "text-muted-strong"}`}
      >
        {name}
      </span>
      <span
        className={`font-heading font-extrabold ${isTop ? "text-brand-amber" : isPodium ? "text-muted-strong" : "text-muted"}`}
      >
        {metric}
      </span>
    </li>
  );
}

// BACKLOG.md Ref 27 originally merged this into the Challenges tab; split
// back out into its own tab since the two grew crowded together.
//
// BACKLOG.md Ref 101 redesign: leads with the header card's "Top Caps" trio
// again, its own heading spelling out what it actually ranks by (raw
// check-in count within a rolling 60-day window) -- then "Lifetime points"
// below for the all-time points-based leaderboard. The two look identical
// (both ranked lists of neighbors) but rank by entirely different things;
// without both headings spelling that out, they read as the same ranking
// shown twice.
export default async function NeighborhoodLeaderboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [neighborhood, leaderboard] = await Promise.all([getNeighborhood(slug), getLeaderboard(slug)]);
  if (!neighborhood) return null;

  if (leaderboard.length === 0 && neighborhood.top_visitors.length === 0) {
    return <p className="text-sm text-muted">No leaderboard activity yet.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      {neighborhood.top_visitors.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-[11px] font-extrabold tracking-wide text-muted uppercase">
            Top Caps · most check-ins, last 60 days
          </h2>
          <ol className="flex flex-col gap-2">
            {neighborhood.top_visitors.map((visitor, i) => (
              <RankRow
                key={visitor.username ?? visitor.displayName ?? i}
                rank={i + 1}
                avatarSeed={visitor.username ?? visitor.displayName ?? `top-visitor-${i}`}
                name={visitor.displayName ?? visitor.username ?? "Neighbor"}
                metric={`${visitor.visitCount} check-in${visitor.visitCount === 1 ? "" : "s"}`}
              />
            ))}
          </ol>
        </div>
      )}

      {leaderboard.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-[11px] font-extrabold tracking-wide text-muted uppercase">Lifetime points</h2>
          <ol className="flex flex-col gap-2">
            {leaderboard.map((entry) => (
              <RankRow
                key={entry.user_id}
                rank={entry.rank}
                avatarSeed={entry.username ?? entry.user_id}
                name={entry.display_name ?? entry.username ?? "Neighbor"}
                metric={`${entry.points} pts`}
              />
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
