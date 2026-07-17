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
  // Set only for event_type "neighbor_connection".
  neighbor_user_id: string | null;
  neighbor: ActorEmbed | ActorEmbed[] | null;
}

interface UserBadgeRow {
  id: string;
  awarded_at: string;
  badge: { name: string; icon: string | null } | { name: string; icon: string | null }[] | null;
  user: ActorEmbed | ActorEmbed[] | null;
}

interface EventFollowRow {
  id: string;
  created_at: string;
  event: { id: string; title: string; venue_id: string | null; venue: { name: string } | { name: string }[] | null } | null;
  user: ActorEmbed | ActorEmbed[] | null;
}

const POINT_EVENT_COLUMNS =
  "id, event_type, created_at, venue_id, venue:venue_id(name), challenge:challenge_id(title), " +
  "user:user_id!inner(display_name, username, visibility), neighbor_user_id, neighbor:neighbor_user_id(display_name, username, visibility)";
const USER_BADGE_COLUMNS =
  "id, awarded_at, badge:badge_id(name, icon), user:user_id!inner(display_name, username, visibility)";
// Base columns only -- callers append their own `event:event_id(...)` embed
// (the neighborhood-scoped queries below need `!inner` plus a
// neighborhood_id/venue.neighborhood_id filter target; the user-scoped one
// doesn't), so this deliberately excludes `event` to avoid two conflicting
// `event:` aliases landing in the same select() call.
const EVENT_FOLLOW_COLUMNS = "id, created_at, user:user_id!inner(display_name, username, visibility)";

function fromPointEventRow(row: PointEventRow): ActivityRecord {
  const actor = single(row.user);
  const venue = single(row.venue);
  const challenge = single(row.challenge);
  const neighbor = row.event_type === "neighbor_connection" ? single(row.neighbor) : null;
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
    eventId: null,
    eventTitle: null,
    otherUserId: row.event_type === "neighbor_connection" ? row.neighbor_user_id : null,
    otherUserDisplayName: neighbor?.display_name ?? null,
    otherUserUsername: neighbor?.username ?? null,
    otherUserVisibility: neighbor?.visibility ?? (row.event_type === "neighbor_connection" ? "private" : null),
    occurredAt: row.created_at,
  };
}

function fromUserBadgeRow(row: UserBadgeRow): ActivityRecord {
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
    eventId: null,
    eventTitle: null,
    otherUserId: null,
    otherUserDisplayName: null,
    otherUserUsername: null,
    otherUserVisibility: null,
    occurredAt: row.awarded_at,
  };
}

function fromEventFollowRow(row: EventFollowRow): ActivityRecord | null {
  const actor = single(row.user);
  const event = row.event;
  if (!event) return null;
  const venue = single(event.venue);
  return {
    id: row.id,
    type: "event_follow",
    actorDisplayName: actor?.display_name ?? null,
    actorUsername: actor?.username ?? null,
    actorVisibility: actor?.visibility ?? "private",
    venueId: event.venue_id,
    venueName: venue?.name ?? null,
    badgeName: null,
    badgeIcon: null,
    challengeTitle: null,
    eventId: event.id,
    eventTitle: event.title,
    otherUserId: null,
    otherUserDisplayName: null,
    otherUserUsername: null,
    otherUserVisibility: null,
    occurredAt: row.created_at,
  };
}

function mergeAndSort(records: ActivityRecord[], limit: number): ActivityRecord[] {
  return records.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0, limit);
}

export class SupabaseActivityRepository implements ActivityRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async listRecentActivity(neighborhoodId: string, limit: number): Promise<ActivityRecord[]> {
    const [pointEvents, badgeUnlocks, eventFollows] = await Promise.all([
      this.supabase
        .from("point_event")
        .select(POINT_EVENT_COLUMNS)
        .eq("neighborhood_id", neighborhoodId)
        .in("event_type", ["checkin", "favorite", "challenge_completion"])
        .order("created_at", { ascending: false })
        .limit(limit),
      this.supabase
        .from("user_badge")
        .select(`${USER_BADGE_COLUMNS}, challenge:challenge_id!inner(neighborhood_id)`)
        .eq("challenge.neighborhood_id", neighborhoodId)
        .order("awarded_at", { ascending: false })
        .limit(limit),
      // Same "owned directly, or owned by a venue in this neighborhood" split
      // listEventsForNeighborhoodAndVenues (events/supabaseRepository.ts)
      // uses for the Upcoming events tab.
      Promise.all([
        this.supabase
          .from("event_follow")
          .select(`${EVENT_FOLLOW_COLUMNS}, event:event_id!inner(id, title, venue_id, neighborhood_id, venue:venue_id(name))`)
          .eq("event.neighborhood_id", neighborhoodId)
          .order("created_at", { ascending: false })
          .limit(limit),
        this.supabase
          .from("event_follow")
          .select(
            `${EVENT_FOLLOW_COLUMNS}, event:event_id!inner(id, title, venue_id, venue:venue_id!inner(name, neighborhood_id))`
          )
          .eq("event.venue.neighborhood_id", neighborhoodId)
          .order("created_at", { ascending: false })
          .limit(limit),
      ]),
    ]);

    if (pointEvents.error) throw new Error(`listRecentActivity (point_event) failed: ${pointEvents.error.message}`);
    if (badgeUnlocks.error) throw new Error(`listRecentActivity (user_badge) failed: ${badgeUnlocks.error.message}`);
    const [neighborhoodFollows, venueFollows] = eventFollows;
    if (neighborhoodFollows.error) {
      throw new Error(`listRecentActivity (event_follow, neighborhood) failed: ${neighborhoodFollows.error.message}`);
    }
    if (venueFollows.error) {
      throw new Error(`listRecentActivity (event_follow, venues) failed: ${venueFollows.error.message}`);
    }

    const records = [
      ...((pointEvents.data ?? []) as unknown as PointEventRow[]).map(fromPointEventRow),
      ...((badgeUnlocks.data ?? []) as unknown as UserBadgeRow[]).map(fromUserBadgeRow),
      ...((neighborhoodFollows.data ?? []) as unknown as EventFollowRow[]).map(fromEventFollowRow),
      ...((venueFollows.data ?? []) as unknown as EventFollowRow[]).map(fromEventFollowRow),
    ].filter((record): record is ActivityRecord => record !== null);

    return mergeAndSort(records, limit);
  }

  async listActivityForUsers(userIds: string[], limit: number): Promise<ActivityRecord[]> {
    if (userIds.length === 0) return [];

    const [pointEvents, badgeUnlocks, eventFollows] = await Promise.all([
      this.supabase
        .from("point_event")
        .select(POINT_EVENT_COLUMNS)
        .in("user_id", userIds)
        // Includes "neighbor_connection" here (unlike listRecentActivity's
        // neighborhood-scoped query) -- a neighbor of yours connecting with
        // someone else is exactly what the Spore Feed should surface, even
        // though it's not a neighborhood event.
        .in("event_type", ["checkin", "favorite", "challenge_completion", "neighbor_connection"])
        .order("created_at", { ascending: false })
        .limit(limit),
      this.supabase
        .from("user_badge")
        .select(USER_BADGE_COLUMNS)
        .in("user_id", userIds)
        .order("awarded_at", { ascending: false })
        .limit(limit),
      this.supabase
        .from("event_follow")
        .select(`${EVENT_FOLLOW_COLUMNS}, event:event_id!inner(id, title, venue_id, venue:venue_id(name))`)
        .in("user_id", userIds)
        .order("created_at", { ascending: false })
        .limit(limit),
    ]);

    if (pointEvents.error) throw new Error(`listActivityForUsers (point_event) failed: ${pointEvents.error.message}`);
    if (badgeUnlocks.error) throw new Error(`listActivityForUsers (user_badge) failed: ${badgeUnlocks.error.message}`);
    if (eventFollows.error) throw new Error(`listActivityForUsers (event_follow) failed: ${eventFollows.error.message}`);

    const records = [
      ...((pointEvents.data ?? []) as unknown as PointEventRow[]).map(fromPointEventRow),
      ...((badgeUnlocks.data ?? []) as unknown as UserBadgeRow[]).map(fromUserBadgeRow),
      ...((eventFollows.data ?? []) as unknown as EventFollowRow[]).map(fromEventFollowRow),
    ].filter((record): record is ActivityRecord => record !== null);

    return mergeAndSort(records, limit);
  }
}
