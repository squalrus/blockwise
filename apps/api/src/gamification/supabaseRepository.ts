import type { SupabaseClient } from "@supabase/supabase-js";
import type { LocationKind } from "@blockwise/types";
import type {
  AwardPointsInput,
  BadgeRecord,
  BadgeRuleRecord,
  BadgeRuleType,
  ChallengeRecord,
  ChallengeTargetKind,
  CompleteChallengeInput,
  GamificationRepository,
  LeaderboardRow,
  LocationContext,
  UserBadgeRecord,
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
  "venue_id, venue:venue_id(name), target_kind, target_count, points_reward, " +
  "badge:badge_id(id, code, name, description, icon), starts_at, ends_at";

interface ChallengeRow {
  id: string;
  neighborhood_id: string;
  title: string;
  description: string | null;
  category_id: string | null;
  category: { name: string } | { name: string }[] | null;
  venue_id: string | null;
  venue: { name: string } | { name: string }[] | null;
  target_kind: ChallengeTargetKind | null;
  target_count: number;
  points_reward: number;
  badge: BadgeRecord | BadgeRecord[] | null;
  starts_at: string;
  ends_at: string | null;
}

function toChallengeRecord(row: ChallengeRow): ChallengeRecord {
  return {
    id: row.id,
    neighborhoodId: row.neighborhood_id,
    title: row.title,
    description: row.description,
    categoryId: row.category_id,
    categoryName: single(row.category)?.name ?? null,
    venueId: row.venue_id,
    venueName: single(row.venue)?.name ?? null,
    targetKind: row.target_kind,
    targetCount: row.target_count,
    pointsReward: row.points_reward,
    badge: single(row.badge),
    startsAt: row.starts_at,
    endsAt: row.ends_at,
  };
}

const BADGE_RULE_COLUMNS =
  "id, badge_id, rule_type, category_id, threshold, badge:badge_id(id, code, name, description, icon)";

interface BadgeRuleRow {
  id: string;
  badge_id: string;
  rule_type: BadgeRuleType;
  category_id: string | null;
  threshold: number;
  badge: BadgeRecord | BadgeRecord[] | null;
}

function toBadgeRuleRecord(row: BadgeRuleRow): BadgeRuleRecord {
  return {
    id: row.id,
    badgeId: row.badge_id,
    badge: single(row.badge) as BadgeRecord,
    ruleType: row.rule_type,
    categoryId: row.category_id,
    threshold: row.threshold,
  };
}

const UNIQUE_VIOLATION = "23505";

export class SupabaseGamificationRepository implements GamificationRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async getLocationContext(locationId: string): Promise<LocationContext | null> {
    const { data, error } = await this.supabase
      .from("venue")
      .select("neighborhood_id, category_id, kind")
      .eq("id", locationId)
      .maybeSingle();

    if (error) throw new Error(`getLocationContext failed: ${error.message}`);
    if (!data) return null;
    return { neighborhoodId: data.neighborhood_id, categoryId: data.category_id, kind: data.kind };
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
    venueId?: string;
    locationKind?: LocationKind;
    now: string;
  }): Promise<ChallengeRecord[]> {
    // ends_at is null for an indefinite challenge, which is always "active"
    // on the end-date side.
    const query = this.supabase
      .from("challenge")
      .select(CHALLENGE_COLUMNS)
      .eq("neighborhood_id", input.neighborhoodId)
      .lte("starts_at", input.now)
      .or(`ends_at.is.null,ends_at.gte.${input.now}`);

    // A check-in can satisfy a category challenge (business check-ins with a
    // mapped category), a location-specific challenge, an any-POI challenge,
    // and/or an any-activity challenge all at once -- match whichever
    // target(s) are provided, plus target_kind='any' unconditionally since
    // this is only ever called after a genuine check-in somewhere in the
    // neighborhood.
    const conditions: string[] = ["target_kind.eq.any"];
    if (input.categoryId) conditions.push(`category_id.eq.${input.categoryId}`);
    if (input.venueId) conditions.push(`venue_id.eq.${input.venueId}`);
    if (input.locationKind) conditions.push(`target_kind.eq.${input.locationKind}`);

    const { data, error } = await query.or(conditions.join(","));
    if (error) throw new Error(`getActiveChallengesForTarget failed: ${error.message}`);
    return (data ?? []).map((row) => toChallengeRecord(row as unknown as ChallengeRow));
  }

  async listChallengesForNeighborhood(neighborhoodId: string, now: string): Promise<ChallengeRecord[]> {
    const { data, error } = await this.supabase
      .from("challenge")
      .select(CHALLENGE_COLUMNS)
      .eq("neighborhood_id", neighborhoodId)
      .or(`ends_at.is.null,ends_at.gte.${now}`)
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

  async countCompletedChallengesForUser(userId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from("user_challenge_completion")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    if (error) throw new Error(`countCompletedChallengesForUser failed: ${error.message}`);
    return count ?? 0;
  }

  async countDistinctVenuesCheckedInForCategory(input: {
    userId: string;
    categoryId: string;
    neighborhoodId: string;
    startsAt: string;
    endsAt: string | null;
  }): Promise<number> {
    let query = this.supabase
      .from("checkin")
      .select("venue_id, venue:venue_id!inner(category_id, neighborhood_id)")
      .eq("user_id", input.userId)
      .not("venue_id", "is", null)
      .gte("checked_in_at", input.startsAt)
      .eq("venue.category_id", input.categoryId)
      .eq("venue.neighborhood_id", input.neighborhoodId);
    if (input.endsAt) query = query.lte("checked_in_at", input.endsAt);

    const { data, error } = await query;
    if (error)
      throw new Error(`countDistinctVenuesCheckedInForCategory failed: ${error.message}`);
    return new Set((data ?? []).map((row) => row.venue_id as string)).size;
  }

  async countDistinctVenuesCheckedInForKind(input: {
    userId: string;
    kind?: LocationKind;
    neighborhoodId: string;
    startsAt: string;
    endsAt: string | null;
  }): Promise<number> {
    let query = this.supabase
      .from("checkin")
      .select("venue_id, venue:venue_id!inner(kind, neighborhood_id)")
      .eq("user_id", input.userId)
      .not("venue_id", "is", null)
      .gte("checked_in_at", input.startsAt)
      .eq("venue.neighborhood_id", input.neighborhoodId);
    if (input.kind) query = query.eq("venue.kind", input.kind);
    if (input.endsAt) query = query.lte("checked_in_at", input.endsAt);

    const { data, error } = await query;
    if (error) throw new Error(`countDistinctVenuesCheckedInForKind failed: ${error.message}`);
    return new Set((data ?? []).map((row) => row.venue_id as string)).size;
  }

  async hasAnyCheckinForLocation(input: {
    userId: string;
    venueId: string;
    startsAt: string;
    endsAt: string | null;
  }): Promise<boolean> {
    let query = this.supabase
      .from("checkin")
      .select("id", { count: "exact", head: true })
      .eq("user_id", input.userId)
      .eq("venue_id", input.venueId)
      .gte("checked_in_at", input.startsAt);
    if (input.endsAt) query = query.lte("checked_in_at", input.endsAt);

    const { count, error } = await query;
    if (error) throw new Error(`hasAnyCheckinForLocation failed: ${error.message}`);
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

  async awardBadgeByCode(userId: string, code: string): Promise<void> {
    const { data: badge, error: badgeError } = await this.supabase
      .from("badge")
      .select("id")
      .eq("code", code)
      .maybeSingle();
    if (badgeError) throw new Error(`awardBadgeByCode (lookup) failed: ${badgeError.message}`);
    if (!badge) return;

    const { error } = await this.supabase.from("user_badge").insert({ user_id: userId, badge_id: badge.id });
    if (error && error.code !== UNIQUE_VIOLATION) {
      throw new Error(`awardBadgeByCode failed: ${error.message}`);
    }
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

  async getUserPointsTotal(userId: string): Promise<number> {
    const { data, error } = await this.supabase
      .from("point_event")
      .select("points")
      .eq("user_id", userId);

    if (error) throw new Error(`getUserPointsTotal failed: ${error.message}`);
    return (data ?? []).reduce((sum, row) => sum + (row.points as number), 0);
  }

  async getUserBadges(userId: string): Promise<UserBadgeRecord[]> {
    const { data, error } = await this.supabase
      .from("user_badge")
      .select("challenge_id, awarded_at, badge:badge_id(id, code, name, description, icon)")
      .eq("user_id", userId)
      .order("awarded_at", { ascending: false });

    if (error) throw new Error(`getUserBadges failed: ${error.message}`);
    return (data ?? []).map((row) => ({
      badge: single(row.badge as BadgeRecord | BadgeRecord[] | null) as BadgeRecord,
      challengeId: row.challenge_id as string | null,
      awardedAt: row.awarded_at as string,
    }));
  }

  async getAllBadges(): Promise<BadgeRecord[]> {
    const { data, error } = await this.supabase.from("badge").select("id, code, name, description, icon");
    if (error) throw new Error(`getAllBadges failed: ${error.message}`);
    return data ?? [];
  }

  async getAllBadgeRules(): Promise<BadgeRuleRecord[]> {
    const { data, error } = await this.supabase.from("badge_rule").select(BADGE_RULE_COLUMNS);
    if (error) throw new Error(`getAllBadgeRules failed: ${error.message}`);
    return (data ?? []).map((row) => toBadgeRuleRecord(row as unknown as BadgeRuleRow));
  }

  async hasEarnedBadge(userId: string, badgeId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from("user_badge")
      .select("id")
      .eq("user_id", userId)
      .eq("badge_id", badgeId)
      .maybeSingle();

    if (error) throw new Error(`hasEarnedBadge failed: ${error.message}`);
    return data !== null;
  }

  async awardRuleBadge(userId: string, badgeId: string): Promise<boolean> {
    const { error } = await this.supabase.from("user_badge").insert({ user_id: userId, badge_id: badgeId });
    if (error) {
      if (error.code === UNIQUE_VIOLATION) return false;
      throw new Error(`awardRuleBadge failed: ${error.message}`);
    }
    return true;
  }

  async countDistinctVenuesForBadge(input: {
    userId: string;
    categoryId?: string;
    kind?: LocationKind;
  }): Promise<number> {
    let query = this.supabase
      .from("checkin")
      .select("venue_id, venue:venue_id!inner(category_id, kind)")
      .eq("user_id", input.userId)
      .not("venue_id", "is", null);
    if (input.categoryId) query = query.eq("venue.category_id", input.categoryId);
    if (input.kind) query = query.eq("venue.kind", input.kind);

    const { data, error } = await query;
    if (error) throw new Error(`countDistinctVenuesForBadge failed: ${error.message}`);
    return new Set((data ?? []).map((row) => row.venue_id as string)).size;
  }

  async countDistinctVenuesCheckedInBetween(input: {
    userId: string;
    startsAt: string;
    endsAt: string;
  }): Promise<number> {
    const { data, error } = await this.supabase
      .from("checkin")
      .select("venue_id")
      .eq("user_id", input.userId)
      .gte("checked_in_at", input.startsAt)
      .lte("checked_in_at", input.endsAt);

    if (error) throw new Error(`countDistinctVenuesCheckedInBetween failed: ${error.message}`);
    return new Set((data ?? []).map((row) => row.venue_id as string)).size;
  }

  async countCheckinsForVenueBetween(input: {
    userId: string;
    venueId: string;
    startsAt: string;
    endsAt: string;
  }): Promise<number> {
    const { count, error } = await this.supabase
      .from("checkin")
      .select("id", { count: "exact", head: true })
      .eq("user_id", input.userId)
      .eq("venue_id", input.venueId)
      .gte("checked_in_at", input.startsAt)
      .lte("checked_in_at", input.endsAt);

    if (error) throw new Error(`countCheckinsForVenueBetween failed: ${error.message}`);
    return count ?? 0;
  }
}
