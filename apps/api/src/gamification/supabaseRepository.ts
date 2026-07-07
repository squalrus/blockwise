import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AwardPointsInput,
  BadgeRecord,
  ChallengeRecord,
  CompleteChallengeInput,
  GamificationRepository,
  LeaderboardRow,
  PoiContext,
  VenueContext,
} from "./repository";

// Without generated Database types passed to createClient, supabase-js can't
// tell a *_id(...) select is a many-to-one embed and falls back to array
// cardinality -- normalize to a single row, mirroring
// venues/supabaseDetailRepository.ts's categoryName() helper.
function single<T>(embed: T[] | T | null | undefined): T | null {
  if (embed === undefined || embed === null) return null;
  return Array.isArray(embed) ? (embed[0] ?? null) : embed;
}

const CHALLENGE_COLUMNS =
  "id, neighborhood_id, title, description, category_id, category:category_id(name), " +
  "poi_id, poi:poi_id(name), target_count, points_reward, " +
  "badge:badge_id(id, code, name, description, icon), starts_at, ends_at";

interface ChallengeRow {
  id: string;
  neighborhood_id: string;
  title: string;
  description: string | null;
  category_id: string | null;
  category: { name: string } | { name: string }[] | null;
  poi_id: string | null;
  poi: { name: string } | { name: string }[] | null;
  target_count: number;
  points_reward: number;
  badge: BadgeRecord | BadgeRecord[] | null;
  starts_at: string;
  ends_at: string;
}

function toChallengeRecord(row: ChallengeRow): ChallengeRecord {
  return {
    id: row.id,
    neighborhoodId: row.neighborhood_id,
    title: row.title,
    description: row.description,
    categoryId: row.category_id,
    categoryName: single(row.category)?.name ?? null,
    poiId: row.poi_id,
    poiName: single(row.poi)?.name ?? null,
    targetCount: row.target_count,
    pointsReward: row.points_reward,
    badge: single(row.badge),
    startsAt: row.starts_at,
    endsAt: row.ends_at,
  };
}

const UNIQUE_VIOLATION = "23505";

export class SupabaseGamificationRepository implements GamificationRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async getVenueContext(venueId: string): Promise<VenueContext | null> {
    const { data, error } = await this.supabase
      .from("venue")
      .select("neighborhood_id, category_id")
      .eq("id", venueId)
      .maybeSingle();

    if (error) throw new Error(`getVenueContext failed: ${error.message}`);
    if (!data) return null;
    return { neighborhoodId: data.neighborhood_id, categoryId: data.category_id };
  }

  async getPoiContext(poiId: string): Promise<PoiContext | null> {
    const { data, error } = await this.supabase
      .from("poi")
      .select("neighborhood_id")
      .eq("id", poiId)
      .maybeSingle();

    if (error) throw new Error(`getPoiContext failed: ${error.message}`);
    if (!data) return null;
    return { neighborhoodId: data.neighborhood_id };
  }

  async getUserIdForDevice(anonymousDeviceId: string): Promise<string | null> {
    const { data, error } = await this.supabase
      .from("app_user")
      .select("id")
      .eq("anonymous_device_id", anonymousDeviceId)
      .maybeSingle();

    if (error) throw new Error(`getUserIdForDevice failed: ${error.message}`);
    return data?.id ?? null;
  }

  async awardPoints(input: AwardPointsInput): Promise<boolean> {
    const { error } = await this.supabase.from("point_event").insert({
      user_id: input.userId,
      neighborhood_id: input.neighborhoodId,
      event_type: input.eventType,
      points: input.points,
      venue_id: input.venueId ?? null,
      poi_id: input.poiId ?? null,
      checkin_id: input.checkinId ?? null,
      challenge_id: input.challengeId ?? null,
    });

    if (error) {
      if (error.code === UNIQUE_VIOLATION) return false;
      throw new Error(`awardPoints failed: ${error.message}`);
    }
    return true;
  }

  async getActiveChallengesForTarget(input: {
    neighborhoodId: string;
    categoryId?: string;
    poiId?: string;
    now: string;
  }): Promise<ChallengeRecord[]> {
    let query = this.supabase
      .from("challenge")
      .select(CHALLENGE_COLUMNS)
      .eq("neighborhood_id", input.neighborhoodId)
      .lte("starts_at", input.now)
      .gte("ends_at", input.now);
    query = input.categoryId
      ? query.eq("category_id", input.categoryId)
      : query.eq("poi_id", input.poiId as string);

    const { data, error } = await query;
    if (error) throw new Error(`getActiveChallengesForTarget failed: ${error.message}`);
    return (data ?? []).map((row) => toChallengeRecord(row as unknown as ChallengeRow));
  }

  async listChallengesForNeighborhood(neighborhoodId: string, now: string): Promise<ChallengeRecord[]> {
    const { data, error } = await this.supabase
      .from("challenge")
      .select(CHALLENGE_COLUMNS)
      .eq("neighborhood_id", neighborhoodId)
      .gte("ends_at", now)
      .order("starts_at");

    if (error) throw new Error(`listChallengesForNeighborhood failed: ${error.message}`);
    return (data ?? []).map((row) => toChallengeRecord(row as unknown as ChallengeRow));
  }

  async hasCompletedChallenge(userId: string, challengeId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from("user_challenge_completion")
      .select("id")
      .eq("user_id", userId)
      .eq("challenge_id", challengeId)
      .maybeSingle();

    if (error) throw new Error(`hasCompletedChallenge failed: ${error.message}`);
    return data !== null;
  }

  async countDistinctVenuesCheckedInForCategory(input: {
    userId: string;
    categoryId: string;
    neighborhoodId: string;
    startsAt: string;
    endsAt: string;
  }): Promise<number> {
    const { data, error } = await this.supabase
      .from("checkin")
      .select("venue_id, venue:venue_id!inner(category_id, neighborhood_id)")
      .eq("user_id", input.userId)
      .not("venue_id", "is", null)
      .gte("checked_in_at", input.startsAt)
      .lte("checked_in_at", input.endsAt)
      .eq("venue.category_id", input.categoryId)
      .eq("venue.neighborhood_id", input.neighborhoodId);

    if (error)
      throw new Error(`countDistinctVenuesCheckedInForCategory failed: ${error.message}`);
    return new Set((data ?? []).map((row) => row.venue_id as string)).size;
  }

  async hasAnyCheckinForPoi(input: {
    userId: string;
    poiId: string;
    startsAt: string;
    endsAt: string;
  }): Promise<boolean> {
    const { count, error } = await this.supabase
      .from("checkin")
      .select("id", { count: "exact", head: true })
      .eq("user_id", input.userId)
      .eq("poi_id", input.poiId)
      .gte("checked_in_at", input.startsAt)
      .lte("checked_in_at", input.endsAt);

    if (error) throw new Error(`hasAnyCheckinForPoi failed: ${error.message}`);
    return (count ?? 0) > 0;
  }

  async completeChallenge(input: CompleteChallengeInput): Promise<boolean> {
    const { error: completionError } = await this.supabase
      .from("user_challenge_completion")
      .insert({ user_id: input.userId, challenge_id: input.challengeId });

    if (completionError) {
      if (completionError.code === UNIQUE_VIOLATION) return false;
      throw new Error(`completeChallenge (completion) failed: ${completionError.message}`);
    }

    if (input.pointsReward > 0) {
      const { error: pointsError } = await this.supabase.from("point_event").insert({
        user_id: input.userId,
        neighborhood_id: input.neighborhoodId,
        event_type: "challenge_completion",
        points: input.pointsReward,
        challenge_id: input.challengeId,
      });
      if (pointsError) throw new Error(`completeChallenge (points) failed: ${pointsError.message}`);
    }

    if (input.badgeId) {
      const { error: badgeError } = await this.supabase
        .from("user_badge")
        .insert({ user_id: input.userId, badge_id: input.badgeId, challenge_id: input.challengeId });
      // A uniqueness conflict here just means the user already holds this
      // badge from a different challenge -- not an error.
      if (badgeError && badgeError.code !== UNIQUE_VIOLATION) {
        throw new Error(`completeChallenge (badge) failed: ${badgeError.message}`);
      }
    }

    return true;
  }

  async getLeaderboard(neighborhoodId: string, limit: number): Promise<LeaderboardRow[]> {
    const { data, error } = await this.supabase
      .from("point_event")
      .select("user_id, points, user:user_id!inner(display_name, username, avatar_url, visibility)")
      .eq("neighborhood_id", neighborhoodId)
      .eq("user.visibility", "public");

    if (error) throw new Error(`getLeaderboard failed: ${error.message}`);

    const totals = new Map<string, LeaderboardRow>();
    for (const row of data ?? []) {
      const user = single(
        row.user as
          | { display_name: string | null; username: string | null; avatar_url: string | null }
          | { display_name: string | null; username: string | null; avatar_url: string | null }[]
      );
      if (!user) continue;

      const userId = row.user_id as string;
      const existing = totals.get(userId);
      totals.set(userId, {
        userId,
        displayName: user.display_name,
        username: user.username,
        avatarUrl: user.avatar_url,
        points: (existing?.points ?? 0) + (row.points as number),
      });
    }

    return Array.from(totals.values())
      .sort((a, b) => b.points - a.points)
      .slice(0, limit);
  }
}
