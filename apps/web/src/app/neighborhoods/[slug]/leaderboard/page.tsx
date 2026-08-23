import type { ReactNode } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import type { LeaderboardEntry, NeighborhoodProfile } from "@blockwise/types";
import { MushroomLogo, MushroomMark, mushroomConfigForUser } from "@blockwise/ui";
import { apiUrl } from "@/lib/api";
import { pinColorFor, shapeFor } from "../../../PlaceListItem";

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

// One row shared by all three ranked lists below -- Top Caps (top_visitors),
// Location leaderboard (top_venues), and Lifetime points (leaderboard) -- so
// all three read as the same visual language despite ranking by different
// metrics and entity kinds. `metric` is pre-formatted ("11 check-ins" /
// "940 pts") rather than a raw number, since the lists' units differ.
// `avatar` is caller-supplied (a person's MushroomMark for the two
// people-ranking lists, a venue's pin icon for the location leaderboard)
// since what's being ranked differs by caller; the rank badge/name/metric
// chrome doesn't. `href` links the row's name where relevant.
function RankRow({
  rank,
  avatar,
  name,
  href,
  metric,
}: {
  rank: number;
  avatar: ReactNode;
  name: string;
  href?: string;
  metric: string;
}) {
  const isTop = rank === 1;
  const isPodium = rank <= 3;
  const nameClass = `flex-1 truncate font-extrabold ${isTop ? "text-nav-foreground" : isPodium ? "text-foreground" : "text-muted-strong"}`;
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
      <span className="shrink-0">{avatar}</span>
      {href ? (
        <Link href={href} className={`${nameClass} hover:underline`}>
          {name}
        </Link>
      ) : (
        <span className={nameClass}>{name}</span>
      )}
      <span
        className={`font-heading font-extrabold ${isTop ? "text-brand-amber" : isPodium ? "text-muted-strong" : "text-muted"}`}
      >
        {metric}
      </span>
    </li>
  );
}

// Neither LeaderboardEntry nor TopVisitor carries the ranked user's real
// avatar/customization -- LeaderboardEntry has no mushroom_customization
// field, and TopVisitor has no seed beyond a username -- so, same precedent
// as ActivityFeed's ActorAvatar, this renders a stable deterministic look
// keyed off whatever public identifier is available.
function PersonAvatar({ seed }: { seed: string }) {
  const config = mushroomConfigForUser(seed);
  return <MushroomMark {...config} size={28} bg={config.bg} />;
}

// Location leaderboard's row icon -- the same deterministic pin shape/color
// PlaceListItem uses in every venue/POI list across the app (and
// LocationSummaryCard uses for the venue's own page header), so a place
// reads as the same icon everywhere it shows up.
function VenueAvatar({ venueId }: { venueId: string }) {
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-orange/[0.16]">
      <MushroomLogo size={18} shape={shapeFor(venueId)} capColor={pinColorFor(venueId)} stemClassName="text-muted-strong" />
    </span>
  );
}

// BACKLOG.md Ref 27 originally merged this into the Challenges tab; split
// back out into its own tab since the two grew crowded together.
//
// BACKLOG.md Ref 101 redesign: leads with the header card's "Top Caps" trio
// again, its own heading spelling out what it actually ranks by (raw
// check-in count within a rolling 60-day window) -- then Location
// leaderboard (top_venues, same window, ranking venues instead of people)
// -- then "Lifetime points" below for the all-time points-based leaderboard.
// All three look identical (ranked lists with a podium) but rank different
// things; without each heading spelling that out, they'd read as the same
// ranking shown three times.
export default async function NeighborhoodLeaderboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [neighborhood, leaderboard] = await Promise.all([getNeighborhood(slug), getLeaderboard(slug)]);
  if (!neighborhood) return null;

  if (leaderboard.length === 0 && neighborhood.top_visitors.length === 0 && neighborhood.top_venues.length === 0) {
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
                avatar={<PersonAvatar seed={visitor.username ?? visitor.displayName ?? `top-visitor-${i}`} />}
                name={visitor.displayName ?? visitor.username ?? "Neighbor"}
                metric={`${visitor.visitCount} check-in${visitor.visitCount === 1 ? "" : "s"}`}
              />
            ))}
          </ol>
        </div>
      )}

      {neighborhood.top_venues.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-[11px] font-extrabold tracking-wide text-muted uppercase">
            Location leaderboard · most check-ins, last 60 days
          </h2>
          <ol className="flex flex-col gap-2">
            {neighborhood.top_venues.map((venue, i) => (
              <RankRow
                key={venue.venueId}
                rank={i + 1}
                avatar={<VenueAvatar venueId={venue.venueId} />}
                name={venue.name}
                href={`/location/${venue.venueId}`}
                metric={`${venue.visitCount} check-in${venue.visitCount === 1 ? "" : "s"}`}
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
                avatar={<PersonAvatar seed={entry.username ?? entry.user_id} />}
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
