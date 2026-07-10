import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActivityRecord, ActivityRepository } from "./repository";

// Without generated Database types passed to createClient, supabase-js can't
// tell a *_id(...) select is a many-to-one embed and falls back to array
// cardinality -- normalize to a single row, mirroring
// gamification/supabaseRepository.ts's single() helper.
function single<T>(embed: T[] | T | null | undefined): T | null {
  if (embed === undefined || embed === null) return null;
  return Array.isArray(embed) ? (embed[0] ?? null) : embed;
}

type ActorEmbed = { display_name: string | null; username: string | null; visibility: "public" | "private" };

interface PointEventRow {
  id: string;
  event_type: string;
  created_at: string;
  venue_id: string | null;
  venue: { name: string } | { name: string }[] | null;
  challenge: { title: string } | { title: string }[] | null;
  user: ActorEmbed | ActorEmbed[] | null;
}

interface UserBadgeRow {
  id: string;
  awarded_at: string;
  badge: { name: string; icon: string | null } | { name: string; icon: string | null }[] | null;
  user: ActorEmbed | ActorEmbed[] | null;
}

export class SupabaseActivityRepository implements ActivityRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async listRecentActivity(neighborhoodId: string, limit: number): Promise<ActivityRecord[]> {
    const [pointEvents, badgeUnlocks] = await Promise.all([
      this.supabase
        .from("point_event")
        .select(
          "id, event_type, created_at, venue_id, venue:venue_id(name), challenge:challenge_id(title), " +
            "user:user_id!inner(display_name, username, visibility)"
        )
        .eq("neighborhood_id", neighborhoodId)
        .in("event_type", ["checkin", "favorite", "challenge_completion"])
        .order("created_at", { ascending: false })
        .limit(limit),
      this.supabase
        .from("user_badge")
        .select(
          "id, awarded_at, badge:badge_id(name, icon), challenge:challenge_id!inner(neighborhood_id), " +
            "user:user_id!inner(display_name, username, visibility)"
        )
        .eq("challenge.neighborhood_id", neighborhoodId)
        .order("awarded_at", { ascending: false })
        .limit(limit),
    ]);

    if (pointEvents.error) throw new Error(`listRecentActivity (point_event) failed: ${pointEvents.error.message}`);
    if (badgeUnlocks.error) throw new Error(`listRecentActivity (user_badge) failed: ${badgeUnlocks.error.message}`);

    const fromPointEvents: ActivityRecord[] = ((pointEvents.data ?? []) as unknown as PointEventRow[]).map((row) => {
      const actor = single(row.user);
      const venue = single(row.venue);
      const challenge = single(row.challenge);
      return {
        id: row.id,
        type: row.event_type as ActivityRecord["type"],
        actorDisplayName: actor?.display_name ?? null,
        actorUsername: actor?.username ?? null,
        actorVisibility: actor?.visibility ?? "private",
        venueId: row.venue_id,
        venueName: venue?.name ?? null,
        badgeName: null,
        badgeIcon: null,
        challengeTitle: challenge?.title ?? null,
        occurredAt: row.created_at,
      };
    });

    const fromBadges: ActivityRecord[] = ((badgeUnlocks.data ?? []) as unknown as UserBadgeRow[]).map((row) => {
      const actor = single(row.user);
      const badge = single(row.badge);
      return {
        id: row.id,
        type: "badge",
        actorDisplayName: actor?.display_name ?? null,
        actorUsername: actor?.username ?? null,
        actorVisibility: actor?.visibility ?? "private",
        venueId: null,
        venueName: null,
        badgeName: badge?.name ?? null,
        badgeIcon: badge?.icon ?? null,
        challengeTitle: null,
        occurredAt: row.awarded_at,
      };
    });

    return [...fromPointEvents, ...fromBadges]
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
      .slice(0, limit);
  }
}
