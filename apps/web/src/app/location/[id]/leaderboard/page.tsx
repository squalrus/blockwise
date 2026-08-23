import type { Metadata } from "next";
import type { TopVisitor } from "@blockwise/types";
import { MushroomMark, mushroomConfigForUser } from "@blockwise/ui";
import { apiUrl } from "@/lib/api";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return { alternates: { canonical: `/location/${id}/leaderboard` } };
}

// Leaderboard tab (BACKLOG.md Ref 101 redesign) -- the same visitCount
// ranking as the summary card's Top Caps badges, at a higher limit.
async function getLeaderboard(id: string): Promise<TopVisitor[]> {
  const res = await fetch(apiUrl(`/venues/${id}/leaderboard`), { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load leaderboard for venue ${id}: ${res.status}`);
  return (await res.json()) as TopVisitor[];
}

// Rank-1/2/3 badge fill, matching the neighborhood leaderboard's own medal
// colors so a ranked-visitor list reads the same wherever it appears.
const RANK_BADGE_CLASSES = ["bg-brand-amber", "bg-rank-silver", "bg-rank-bronze"];

function LeaderboardRow({ rank, visitor }: { rank: number; visitor: TopVisitor }) {
  const isTop = rank === 1;
  const isPodium = rank <= 3;
  // TopVisitor carries no avatar/customization of its own -- same
  // precedent as the neighborhood leaderboard's RankRow -- so this renders a
  // stable deterministic look keyed off whatever public identifier exists.
  const avatarConfig = mushroomConfigForUser(visitor.username ?? visitor.displayName ?? `visitor-${rank}`);
  const name = visitor.displayName ?? visitor.username ?? "Neighbor";

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
        {visitor.visitCount} check-in{visitor.visitCount === 1 ? "" : "s"}
      </span>
    </li>
  );
}

export default async function LocationLeaderboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const leaderboard = await getLeaderboard(id);

  if (leaderboard.length === 0) {
    return <p className="text-sm text-muted">No check-ins yet.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-[11px] font-extrabold tracking-wide text-muted uppercase">
        Top Caps · most check-ins, last 60 days
      </h2>
      <ol className="flex flex-col gap-2">
        {leaderboard.map((visitor, i) => (
          <LeaderboardRow key={visitor.username ?? visitor.displayName ?? i} rank={i + 1} visitor={visitor} />
        ))}
      </ol>
    </div>
  );
}
