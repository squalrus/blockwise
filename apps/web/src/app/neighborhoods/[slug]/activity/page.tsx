import type { ActivityItem, NeighborhoodProfile } from "@blockwise/types";
import { apiUrl } from "@/lib/api";
import { BadgeIcon } from "../../../BadgeIcon";
import { Timeline } from "../../../Timeline";

async function getNeighborhood(slug: string): Promise<NeighborhoodProfile | null> {
  const res = await fetch(apiUrl(`/neighborhoods/${slug}`), { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load neighborhood ${slug}: ${res.status}`);
  return (await res.json()) as NeighborhoodProfile;
}

async function getActivity(id: string): Promise<ActivityItem[]> {
  const res = await fetch(apiUrl(`/neighborhoods/${id}/activity`), { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load activity for neighborhood ${id}: ${res.status}`);
  return (await res.json()) as ActivityItem[];
}

function describe(item: ActivityItem): string {
  switch (item.type) {
    case "checkin":
      return `${item.actor_name} checked in at ${item.venue_name ?? "a location"}`;
    case "favorite":
      return `${item.actor_name} favorited ${item.venue_name ?? "a location"}`;
    case "challenge_completion":
      return `${item.actor_name} completed the ${item.challenge_title ?? "a"} challenge`;
    case "badge":
      return `${item.actor_name} unlocked the ${item.badge_name ?? ""} badge`;
  }
}

// BACKLOG.md Ref 27: Recent activity tab -- a neighborhood-wide feed of
// check-ins, favorites, challenge completions, and badge unlocks, with actor
// names already masked server-side per profile visibility. Uses the same
// Timeline UI as CheckinTimeline (account/profile pages' "Recent check-ins")
// so chronological feeds read consistently across the app.
export default async function NeighborhoodActivityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const neighborhood = await getNeighborhood(slug);
  if (!neighborhood) return null;

  const activity = await getActivity(neighborhood.id);

  return (
    <Timeline
      emptyMessage="No activity yet."
      items={activity.map((item) => ({
        key: item.id,
        primary: item.venue_id ? (
          <a
            href={`/location/${item.venue_id}`}
            className="text-sm font-extrabold text-foreground hover:text-brand-purple"
          >
            {describe(item)}
          </a>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-sm font-extrabold text-foreground">
            {describe(item)}
            {item.type === "badge" && <BadgeIcon icon={item.badge_icon} name={item.badge_name ?? "Badge"} />}
          </span>
        ),
        timestamp: item.occurred_at,
      }))}
    />
  );
}
