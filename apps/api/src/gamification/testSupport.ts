import type { LocationKind } from "@blockwise/types";
import {
  BadgeCodeTakenError,
  type AwardPointsInput,
  type BadgeRecord,
  type BadgeRuleRecord,
  type ChallengeRecord,
  type ChallengeTargetKind,
  type CompletedChallengeRecord,
  type CompleteChallengeInput,
  type GamificationRepository,
  type LeaderboardRow,
  type LocationContext,
  type UserBadgeRecord,
} from "./repository";

// A null endsAt (indefinite challenge) never excludes a check-in/window comparison.
function withinEnd(checkedInAt: string, endsAt: string | null): boolean {
  return endsAt === null || checkedInAt <= endsAt;
}

// In-memory fake shared by points.test.ts and challenges.test.ts, mirroring
// the FakeCheckinRepository/FakeFavoriteRepository pattern used elsewhere --
// shared here (rather than duplicated per test file) since both suites
// exercise the same wide GamificationRepository interface.
export class FakeGamificationRepository implements GamificationRepository {
  locations = new Map<string, LocationContext>();
  pointEvents: (AwardPointsInput & { id: string })[] = [];
  challenges: ChallengeRecord[] = [];
  completions = new Set<string>(); // `${userId}:${challengeId}`
  badges: { userId: string; badgeId: string; challengeId: string | null }[] = [];
  // Full badge details keyed by id, for tests that need getUserBadges to
  // return real name/icon/description rather than a placeholder.
  badgeCatalog = new Map<string, BadgeRecord>();
  private badgeAwardedAt = new Map<string, string>();
  private nextBadgeAwardMs = 1;
  private completionCompletedAt = new Map<string, string>(); // `${userId}:${challengeId}`
  private nextCompletionMs = 1;
  // Neighborhood names keyed by id, for tests that need
  // getUserCompletedChallenges to return a real name rather than the id.
  neighborhoodNames = new Map<string, string>();
  checkins: { userId: string; venueId: string; checkedInAt: string }[] = [];
  // Full venue directory (not just checked-in ones) -- backs
  // countActiveLocationsForKind, mirroring the venue table's neighborhood_id/
  // kind/status columns.
  venues: { neighborhoodId: string; kind: LocationKind; status: "active" | "hidden" }[] = [];
  users = new Map<string, { displayName: string | null; username: string | null; avatarUrl: string | null; visibility: "public" | "private" }>();
  badgeRules: BadgeRuleRecord[] = [];
  private nextId = 1;

  async getLocationContext(locationId: string): Promise<LocationContext | null> {
    return this.locations.get(locationId) ?? null;
  }

  async awardPoints(input: AwardPointsInput): Promise<boolean> {
    if (input.checkinId && this.pointEvents.some((e) => e.checkinId === input.checkinId)) {
      return false;
    }
    if (
      input.eventType === "favorite" &&
      this.pointEvents.some(
        (e) => e.eventType === "favorite" && e.userId === input.userId && e.venueId === input.venueId
      )
    ) {
      return false;
    }
    if (
      input.eventType === "neighbor_connection" &&
      this.pointEvents.some(
        (e) =>
          e.eventType === "neighbor_connection" &&
          e.userId === input.userId &&
          e.neighborUserId === input.neighborUserId
      )
    ) {
      return false;
    }
    this.pointEvents.push({ ...input, id: `point-${this.nextId++}` });
    return true;
  }

  async getActiveChallengesForTarget(input: {
    neighborhoodId: string;
    categoryId?: string;
    venueId?: string;
    locationKind?: LocationKind;
    now: string;
  }): Promise<ChallengeRecord[]> {
    return this.challenges.filter(
      (c) =>
        (c.neighborhoodId === input.neighborhoodId || c.neighborhoodId === null) &&
        c.startsAt <= input.now &&
        (c.endsAt === null || c.endsAt >= input.now) &&
        (c.targetKind === "any" ||
          (input.categoryId && c.categoryId === input.categoryId) ||
          (input.venueId && c.venueId === input.venueId) ||
          (input.locationKind && c.targetKind === input.locationKind))
    );
  }

  async listChallengesForNeighborhood(neighborhoodId: string, now: string): Promise<ChallengeRecord[]> {
    return this.challenges.filter(
      (c) => (c.neighborhoodId === neighborhoodId || c.neighborhoodId === null) && (c.endsAt === null || c.endsAt >= now)
    );
  }

  async listAllChallengesForAdmin(): Promise<ChallengeRecord[]> {
    return [...this.challenges];
  }

  async listChallengesForNeighborhoodAdmin(neighborhoodId: string): Promise<ChallengeRecord[]> {
    return this.challenges.filter((c) => c.neighborhoodId === neighborhoodId);
  }

  async createChallenge(input: {
    neighborhoodId: string | null;
    title: string;
    description: string | null;
    categoryId: string | null;
    targetKind: ChallengeRecord["targetKind"];
    targetCount: number;
    targetCountLive: boolean;
    pointsReward: number;
    badgeId: string | null;
    startsAt: string;
    endsAt: string | null;
  }): Promise<ChallengeRecord> {
    const created: ChallengeRecord = {
      id: `challenge-${this.nextId++}`,
      neighborhoodId: input.neighborhoodId,
      title: input.title,
      description: input.description,
      categoryId: input.categoryId,
      categoryName: null,
      venueId: null,
      venueName: null,
      targetKind: input.targetKind,
      targetCount: input.targetCount,
      targetCountLive: input.targetCountLive,
      pointsReward: input.pointsReward,
      badge: input.badgeId ? (this.badgeCatalog.get(input.badgeId) ?? makeBadge({ id: input.badgeId })) : null,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
    };
    this.challenges.push(created);
    return created;
  }

  async updateChallenge(
    id: string,
    patch: {
      title?: string;
      description?: string | null;
      categoryId?: string | null;
      targetKind?: ChallengeTargetKind | null;
      targetCount?: number;
      targetCountLive?: boolean;
      pointsReward?: number;
      badgeId?: string | null;
      endsAt?: string | null;
    },
    options?: { neighborhoodId?: string }
  ): Promise<ChallengeRecord | null> {
    const existing = this.challenges.find((c) => c.id === id);
    if (!existing) return null;
    if (options?.neighborhoodId && existing.neighborhoodId !== options.neighborhoodId) return null;
    if (patch.title !== undefined) existing.title = patch.title;
    if (patch.description !== undefined) existing.description = patch.description;
    if (patch.categoryId !== undefined) existing.categoryId = patch.categoryId;
    if (patch.targetKind !== undefined) existing.targetKind = patch.targetKind;
    if (patch.targetCount !== undefined) existing.targetCount = patch.targetCount;
    if (patch.targetCountLive !== undefined) existing.targetCountLive = patch.targetCountLive;
    if (patch.pointsReward !== undefined) existing.pointsReward = patch.pointsReward;
    if (patch.badgeId !== undefined) {
      existing.badge = patch.badgeId ? (this.badgeCatalog.get(patch.badgeId) ?? makeBadge({ id: patch.badgeId })) : null;
    }
    if (patch.endsAt !== undefined) existing.endsAt = patch.endsAt;
    return existing;
  }

  async hasCompletedChallenge(userId: string, challengeId: string): Promise<boolean> {
    return this.completions.has(`${userId}:${challengeId}`);
  }

  async countCompletedChallengesForUser(userId: string): Promise<number> {
    return Array.from(this.completions).filter((key) => key.startsWith(`${userId}:`)).length;
  }

  async completedChallengeIds(challengeIds: string[]): Promise<Set<string>> {
    const wanted = new Set(challengeIds);
    const result = new Set<string>();
    for (const key of this.completions) {
      const challengeId = key.slice(key.indexOf(":") + 1);
      if (wanted.has(challengeId)) result.add(challengeId);
    }
    return result;
  }

  async countDistinctVenuesCheckedInForCategory(input: {
    userId: string;
    categoryId: string;
    neighborhoodId: string | null;
    startsAt: string;
    endsAt: string | null;
  }): Promise<number> {
    const venueIds = new Set(
      this.checkins
        .filter(
          (c) =>
            c.userId === input.userId &&
            c.venueId &&
            c.checkedInAt >= input.startsAt &&
            withinEnd(c.checkedInAt, input.endsAt) &&
            this.locations.get(c.venueId)?.categoryId === input.categoryId &&
            (!input.neighborhoodId || this.locations.get(c.venueId)?.neighborhoodId === input.neighborhoodId)
        )
        .map((c) => c.venueId)
    );
    return venueIds.size;
  }

  async countDistinctVenuesCheckedInForKind(input: {
    userId: string;
    kind?: LocationKind;
    neighborhoodId: string | null;
    startsAt: string;
    endsAt: string | null;
  }): Promise<number> {
    const venueIds = new Set(
      this.checkins
        .filter(
          (c) =>
            c.userId === input.userId &&
            c.venueId &&
            c.checkedInAt >= input.startsAt &&
            withinEnd(c.checkedInAt, input.endsAt) &&
            (!input.kind || this.locations.get(c.venueId)?.kind === input.kind) &&
            (!input.neighborhoodId || this.locations.get(c.venueId)?.neighborhoodId === input.neighborhoodId)
        )
        .map((c) => c.venueId)
    );
    return venueIds.size;
  }

  async countActiveLocationsForKind(input: { neighborhoodId: string | null; kind: LocationKind }): Promise<number> {
    return this.venues.filter(
      (v) => (!input.neighborhoodId || v.neighborhoodId === input.neighborhoodId) && v.kind === input.kind && v.status === "active"
    ).length;
  }

  async hasAnyCheckinForLocation(input: {
    userId: string;
    venueId: string;
    startsAt: string;
    endsAt: string | null;
  }): Promise<boolean> {
    return this.checkins.some(
      (c) =>
        c.userId === input.userId &&
        c.venueId === input.venueId &&
        c.checkedInAt >= input.startsAt &&
        withinEnd(c.checkedInAt, input.endsAt)
    );
  }

  async completeChallenge(input: CompleteChallengeInput): Promise<boolean> {
    const key = `${input.userId}:${input.challengeId}`;
    if (this.completions.has(key)) return false;
    this.completions.add(key);
    this.completionCompletedAt.set(key, new Date(this.nextCompletionMs++).toISOString());

    if (input.pointsReward > 0) {
      this.pointEvents.push({
        id: `point-${this.nextId++}`,
        userId: input.userId,
        neighborhoodId: input.neighborhoodId ?? undefined,
        eventType: "challenge_completion",
        points: input.pointsReward,
        challengeId: input.challengeId,
      });
    }
    if (input.badgeId) {
      this.badges.push({ userId: input.userId, badgeId: input.badgeId, challengeId: input.challengeId });
      this.badgeAwardedAt.set(
        `${input.userId}:${input.badgeId}`,
        new Date(this.nextBadgeAwardMs++).toISOString()
      );
    }
    return true;
  }

  badgesByCode = new Map<string, string>(); // code -> badgeId, for tests that care which badge was awarded

  async awardBadgeByCode(userId: string, code: string): Promise<void> {
    const badgeId = this.badgesByCode.get(code) ?? code;
    if (this.badges.some((b) => b.userId === userId && b.badgeId === badgeId)) return;
    this.badges.push({ userId, badgeId, challengeId: null });
    this.badgeAwardedAt.set(`${userId}:${badgeId}`, new Date(this.nextBadgeAwardMs++).toISOString());
  }

  async getLeaderboard(neighborhoodId: string, limit: number): Promise<LeaderboardRow[]> {
    const totals = new Map<string, number>();
    for (const event of this.pointEvents) {
      if (event.neighborhoodId !== neighborhoodId) continue;
      const user = this.users.get(event.userId);
      if (!user || user.visibility !== "public") continue;
      totals.set(event.userId, (totals.get(event.userId) ?? 0) + event.points);
    }

    return Array.from(totals.entries())
      .map(([userId, points]) => {
        const user = this.users.get(userId)!;
        return {
          userId,
          displayName: user.displayName,
          username: user.username,
          avatarUrl: user.avatarUrl,
          points,
        };
      })
      .sort((a, b) => b.points - a.points)
      .slice(0, limit);
  }

  async getUserPointsTotal(userId: string): Promise<number> {
    return this.pointEvents
      .filter((e) => e.userId === userId)
      .reduce((sum, e) => sum + e.points, 0);
  }

  async getUserBadges(userId: string): Promise<UserBadgeRecord[]> {
    return this.badges
      .filter((b) => b.userId === userId)
      .map((b) => ({
        badge: this.badgeCatalog.get(b.badgeId) ?? makeBadge({ id: b.badgeId, code: b.badgeId, name: b.badgeId }),
        challengeId: b.challengeId,
        awardedAt: this.badgeAwardedAt.get(`${userId}:${b.badgeId}`) ?? new Date(0).toISOString(),
      }))
      .sort((a, b) => (a.awardedAt < b.awardedAt ? 1 : -1));
  }

  async getUserCompletedChallenges(userId: string): Promise<CompletedChallengeRecord[]> {
    return Array.from(this.completions)
      .filter((key) => key.startsWith(`${userId}:`))
      .flatMap((key) => {
        const challengeId = key.slice(`${userId}:`.length);
        const challenge = this.challenges.find((c) => c.id === challengeId);
        if (!challenge) return [];
        return [
          {
            id: challenge.id,
            title: challenge.title,
            description: challenge.description,
            neighborhoodId: challenge.neighborhoodId,
            neighborhoodName: challenge.neighborhoodId
              ? (this.neighborhoodNames.get(challenge.neighborhoodId) ?? challenge.neighborhoodId)
              : null,
            pointsReward: challenge.pointsReward,
            badge: challenge.badge,
            completedAt: this.completionCompletedAt.get(key) ?? new Date(0).toISOString(),
          },
        ];
      })
      .sort((a, b) => (a.completedAt < b.completedAt ? 1 : -1));
  }

  async getAllBadges(): Promise<BadgeRecord[]> {
    return Array.from(this.badgeCatalog.values());
  }

  async createBadge(input: {
    code: string;
    name: string;
    description: string | null;
    icon: string | null;
    neighborhoodId: string | null;
  }): Promise<BadgeRecord> {
    if (Array.from(this.badgeCatalog.values()).some((b) => b.code === input.code)) {
      throw new BadgeCodeTakenError(input.code);
    }
    const created: BadgeRecord = { id: `badge-${this.nextId++}`, ...input };
    this.badgeCatalog.set(created.id, created);
    return created;
  }

  async updateBadge(
    id: string,
    patch: { name?: string; description?: string | null; icon?: string | null },
    options?: { neighborhoodId?: string }
  ): Promise<BadgeRecord | null> {
    const existing = this.badgeCatalog.get(id);
    if (!existing) return null;
    if (options?.neighborhoodId && existing.neighborhoodId !== options.neighborhoodId) return null;
    const updated = { ...existing };
    if (patch.name !== undefined) updated.name = patch.name;
    if (patch.description !== undefined) updated.description = patch.description;
    if (patch.icon !== undefined) updated.icon = patch.icon;
    this.badgeCatalog.set(id, updated);
    return updated;
  }

  async getAllBadgeRules(): Promise<BadgeRuleRecord[]> {
    return this.badgeRules;
  }

  async hasEarnedBadge(userId: string, badgeId: string): Promise<boolean> {
    return this.badges.some((b) => b.userId === userId && b.badgeId === badgeId);
  }

  async awardRuleBadge(userId: string, badgeId: string): Promise<boolean> {
    if (this.badges.some((b) => b.userId === userId && b.badgeId === badgeId)) return false;
    this.badges.push({ userId, badgeId, challengeId: null });
    this.badgeAwardedAt.set(`${userId}:${badgeId}`, new Date(this.nextBadgeAwardMs++).toISOString());
    return true;
  }

  async countDistinctVenuesForBadge(input: {
    userId: string;
    categoryId?: string;
    kind?: LocationKind;
    neighborhoodId?: string | null;
  }): Promise<number> {
    const venueIds = new Set(
      this.checkins
        .filter(
          (c) =>
            c.userId === input.userId &&
            (!input.categoryId || this.locations.get(c.venueId)?.categoryId === input.categoryId) &&
            (!input.kind || this.locations.get(c.venueId)?.kind === input.kind) &&
            (!input.neighborhoodId || this.locations.get(c.venueId)?.neighborhoodId === input.neighborhoodId)
        )
        .map((c) => c.venueId)
    );
    return venueIds.size;
  }

  async countDistinctVenuesCheckedInBetween(input: {
    userId: string;
    startsAt: string;
    endsAt: string;
  }): Promise<number> {
    const venueIds = new Set(
      this.checkins
        .filter(
          (c) =>
            c.userId === input.userId &&
            c.checkedInAt >= input.startsAt &&
            c.checkedInAt <= input.endsAt
        )
        .map((c) => c.venueId)
    );
    return venueIds.size;
  }

  async countCheckinsForVenueBetween(input: {
    userId: string;
    venueId: string;
    startsAt: string;
    endsAt: string;
  }): Promise<number> {
    return this.checkins.filter(
      (c) =>
        c.userId === input.userId &&
        c.venueId === input.venueId &&
        c.checkedInAt >= input.startsAt &&
        c.checkedInAt <= input.endsAt
    ).length;
  }

  // Ranks distinct visitors by check-in count (ties broken by most recent),
  // mirroring checkins/checkin.ts's rankRecentVisitors -- kept as a small
  // local helper rather than importing that function here, since the real
  // window-cutoff filtering (RECENT_VISITOR_WINDOW_MS) doesn't matter for
  // these tests' purposes and duplicating just the ranking arithmetic keeps
  // this fake dependency-free like the rest of the file.
  private topVisitor(checkins: { userId: string; checkedInAt: string }[]): string | undefined {
    const counts = new Map<string, { count: number; mostRecent: string }>();
    for (const c of checkins) {
      const existing = counts.get(c.userId);
      counts.set(c.userId, {
        count: (existing?.count ?? 0) + 1,
        mostRecent: existing && existing.mostRecent > c.checkedInAt ? existing.mostRecent : c.checkedInAt,
      });
    }
    return [...counts.entries()].sort(
      (a, b) => b[1].count - a[1].count || b[1].mostRecent.localeCompare(a[1].mostRecent)
    )[0]?.[0];
  }

  async isTopVisitorForVenue(venueId: string, userId: string): Promise<boolean> {
    return this.topVisitor(this.checkins.filter((c) => c.venueId === venueId)) === userId;
  }

  async isTopVisitorForNeighborhood(neighborhoodId: string, userId: string): Promise<boolean> {
    return (
      this.topVisitor(this.checkins.filter((c) => this.locations.get(c.venueId)?.neighborhoodId === neighborhoodId)) ===
      userId
    );
  }
}

export function makeBadge(overrides: Partial<BadgeRecord> = {}): BadgeRecord {
  return {
    id: "badge-1",
    code: "test_badge",
    name: "Test Badge",
    description: null,
    icon: null,
    neighborhoodId: null,
    ...overrides,
  };
}

export function makeBadgeRule(overrides: Partial<BadgeRuleRecord> = {}): BadgeRuleRecord {
  const badge = overrides.badge ?? makeBadge();
  return {
    id: "badge-rule-1",
    badgeId: badge.id,
    badge,
    ruleType: "category_milestone",
    categoryId: null,
    threshold: 1,
    ...overrides,
  };
}

export function makeChallenge(overrides: Partial<ChallengeRecord> = {}): ChallengeRecord {
  return {
    id: "challenge-1",
    neighborhoodId: "neighborhood-1",
    title: "Test Challenge",
    description: null,
    categoryId: null,
    categoryName: null,
    venueId: null,
    venueName: null,
    targetKind: null,
    targetCount: 1,
    targetCountLive: false,
    pointsReward: 0,
    badge: null,
    startsAt: "2026-07-01T00:00:00.000Z",
    endsAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}
