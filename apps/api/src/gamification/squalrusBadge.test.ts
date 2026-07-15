import { describe, expect, it } from "vitest";
import type { AppUserRecord, AuthRepository } from "../auth/repository";
import { awardSqualrusConnectionBadge, SQUALRUS_BADGE_CODE } from "./squalrusBadge";
import { FakeGamificationRepository } from "./testSupport";

function fakeUser(overrides: Partial<AppUserRecord>): AppUserRecord {
  return {
    id: "user-1",
    isAnonymous: false,
    accountType: "consumer",
    authUserId: null,
    authProvider: null,
    email: null,
    phone: null,
    anonymousDeviceId: null,
    displayName: null,
    avatarUrl: null,
    avatarStyle: "social",
    mushroomCustomization: null,
    username: null,
    visibility: "private",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

// Minimal fake -- awardSqualrusConnectionBadge only ever calls getByUsername.
function fakeAuthRepository(users: AppUserRecord[]): AuthRepository {
  return {
    getByUsername: async (username) => users.find((u) => u.username === username) ?? null,
  } as unknown as AuthRepository;
}

describe("awardSqualrusConnectionBadge", () => {
  it("awards the badge to whichever side of a connection isn't @squalrus", async () => {
    const squalrus = fakeUser({ id: "user-squalrus", username: "squalrus" });
    const auth = fakeAuthRepository([squalrus]);
    const gamification = new FakeGamificationRepository();

    await awardSqualrusConnectionBadge("user-1", "user-squalrus", auth, gamification);

    expect(gamification.badges).toContainEqual({
      userId: "user-1",
      badgeId: SQUALRUS_BADGE_CODE,
      challengeId: null,
    });
  });

  it("does nothing when the other party isn't @squalrus", async () => {
    const squalrus = fakeUser({ id: "user-squalrus", username: "squalrus" });
    const auth = fakeAuthRepository([squalrus]);
    const gamification = new FakeGamificationRepository();

    await awardSqualrusConnectionBadge("user-1", "user-2", auth, gamification);

    expect(gamification.badges).toEqual([]);
  });

  it("is a no-op when no account is registered under @squalrus", async () => {
    const auth = fakeAuthRepository([]);
    const gamification = new FakeGamificationRepository();

    await awardSqualrusConnectionBadge("user-1", "user-2", auth, gamification);

    expect(gamification.badges).toEqual([]);
  });
});
