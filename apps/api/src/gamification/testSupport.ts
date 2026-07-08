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

// In-memory fake shared by points.test.ts and challenges.test.ts, mirroring
// the FakeCheckinRepository/FakeFavoriteRepository pattern used elsewhere --
// shared here (rather than duplicated per test file) since both suites
// exercise the same wide GamificationRepository interface.
export class FakeGamificationRepository implements GamificationRepository {
  venues = new Map<string, VenueContext>();
  pois = new Map<string, PoiContext>();
  pointEvents: (AwardPointsInput & { id: string })[] = [];
  challenges: ChallengeRecord[] = [];
  completions = new Set<string>(); // `${userId}:${challengeId}`
  badges: { userId: string; badgeId: string; challengeId: string | null }[] = [];
  checkins: { userId: string; venueId?: string; poiId?: string; checkedInAt: string }[] = [];
  users = new Map<string, { displayName: string | null; username: string | null; avatarUrl: string | null; visibility: "public" | "private" }>();
  private nextId = 1;

  async getVenueContext(venueId: string): Promise<VenueContext | null> {
    return this.venues.get(venueId) ?? null;
  }

  async getPoiContext(poiId: string): Promise<PoiContext | null> {
    return this.pois.get(poiId) ?? null;
  }

  deviceUsers = new Map<string, string>();

  async getUserIdForDevice(anonymousDeviceId: string): Promise<string | null> {
    return this.deviceUsers.get(anonymousDeviceId) ?? null;
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
    this.pointEvents.push({ ...input, id: `point-${this.nextId++}` });
    return true;
  }

  async getActiveChallengesForTarget(input: {
    neighborhoodId: string;
    categoryId?: string;
    poiId?: string;
    now: string;
  }): Promise<ChallengeRecord[]> {
    return this.challenges.filter(
      (c) =>
        c.neighborhoodId === input.neighborhoodId &&
        c.startsAt <= input.now &&
        c.endsAt >= input.now &&
        (input.categoryId ? c.categoryId === input.categoryId : c.poiId === input.poiId)
    );
  }

  async listChallengesForNeighborhood(neighborhoodId: string, now: string): Promise<ChallengeRecord[]> {
    return this.challenges.filter((c) => c.neighborhoodId === neighborhoodId && c.endsAt >= now);
  }

  async hasCompletedChallenge(userId: string, challengeId: string): Promise<boolean> {
    return this.completions.has(`${userId}:${challengeId}`);
  }

  async countDistinctVenuesCheckedInForCategory(input: {
    userId: string;
    categoryId: string;
    neighborhoodId: string;
    startsAt: string;
    endsAt: string;
  }): Promise<number> {
    const venueIds = new Set(
      this.checkins
        .filter(
          (c) =>
            c.userId === input.userId &&
            c.venueId &&
            c.checkedInAt >= input.startsAt &&
            c.checkedInAt <= input.endsAt &&
            this.venues.get(c.venueId)?.categoryId === input.categoryId &&
            this.venues.get(c.venueId)?.neighborhoodId === input.neighborhoodId
        )
        .map((c) => c.venueId as string)
    );
    return venueIds.size;
  }

  async hasAnyCheckinForPoi(input: {
    userId: string;
    poiId: string;
    startsAt: string;
    endsAt: string;
  }): Promise<boolean> {
    return this.checkins.some(
      (c) =>
        c.userId === input.userId &&
        c.poiId === input.poiId &&
        c.checkedInAt >= input.startsAt &&
        c.checkedInAt <= input.endsAt
    );
  }

  async completeChallenge(input: CompleteChallengeInput): Promise<boolean> {
    const key = `${input.userId}:${input.challengeId}`;
    if (this.completions.has(key)) return false;
    this.completions.add(key);

    if (input.pointsReward > 0) {
      this.pointEvents.push({
        id: `point-${this.nextId++}`,
        userId: input.userId,
        neighborhoodId: input.neighborhoodId,
        eventType: "challenge_completion",
        points: input.pointsReward,
        challengeId: input.challengeId,
      });
    }
    if (input.badgeId) {
      this.badges.push({ userId: input.userId, badgeId: input.badgeId, challengeId: input.challengeId });
    }
    return true;
  }

  badgesByCode = new Map<string, string>(); // code -> badgeId, for tests that care which badge was awarded

  async awardBadgeByCode(userId: string, code: string): Promise<void> {
    const badgeId = this.badgesByCode.get(code) ?? code;
    if (this.badges.some((b) => b.userId === userId && b.badgeId === badgeId)) return;
    this.badges.push({ userId, badgeId, challengeId: null });
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
}

export function makeBadge(overrides: Partial<BadgeRecord> = {}): BadgeRecord {
  return {
    id: "badge-1",
    code: "test_badge",
    name: "Test Badge",
    description: null,
    icon: null,
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
    poiId: null,
    poiName: null,
    targetCount: 1,
    pointsReward: 0,
    badge: null,
    startsAt: "2026-07-01T00:00:00.000Z",
    endsAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}
