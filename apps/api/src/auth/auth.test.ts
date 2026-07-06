import { describe, expect, it } from "vitest";
import { completeLogin, completeSignup, promoteToBusiness } from "./auth";
import type { AppUserRecord, AuthRepository, CompleteSignupInput } from "./repository";
import type { VerifiedAuthUser } from "./verifyToken";

// In-memory fake, mirroring the pattern used for CheckinRepository/
// ClaimRepository tests.
class FakeAuthRepository implements AuthRepository {
  users: AppUserRecord[] = [];
  checkinUserIds: string[] = [];
  private nextId = 1;

  addAnonymousUser(deviceId: string): AppUserRecord {
    const user: AppUserRecord = {
      id: `user-${this.nextId++}`,
      isAnonymous: true,
      accountType: "consumer",
      authUserId: null,
      authProvider: null,
      email: null,
      phone: null,
      anonymousDeviceId: deviceId,
      createdAt: new Date().toISOString(),
    };
    this.users.push(user);
    this.checkinUserIds.push(user.id);
    return user;
  }

  async getByAuthUserId(authUserId: string): Promise<AppUserRecord | null> {
    return this.users.find((u) => u.authUserId === authUserId) ?? null;
  }

  async getByAnonymousDeviceId(deviceId: string): Promise<AppUserRecord | null> {
    return this.users.find((u) => u.anonymousDeviceId === deviceId) ?? null;
  }

  async completeSignup(input: CompleteSignupInput): Promise<AppUserRecord> {
    const deviceUser = input.anonymousDeviceId
      ? await this.getByAnonymousDeviceId(input.anonymousDeviceId)
      : null;

    if (deviceUser && deviceUser.isAnonymous) {
      deviceUser.isAnonymous = false;
      deviceUser.accountType = input.accountType;
      deviceUser.authUserId = input.authUserId;
      deviceUser.authProvider = input.authProvider;
      deviceUser.email = input.email;
      deviceUser.phone = input.phone;
      return deviceUser;
    }

    const created: AppUserRecord = {
      id: `user-${this.nextId++}`,
      isAnonymous: false,
      accountType: input.accountType,
      authUserId: input.authUserId,
      authProvider: input.authProvider,
      email: input.email,
      phone: input.phone,
      anonymousDeviceId: null,
      createdAt: new Date().toISOString(),
    };
    this.users.push(created);
    return created;
  }

  async mergeAnonymousHistory(
    targetUserId: string,
    anonymousUserId: string,
    deviceId: string
  ): Promise<AppUserRecord> {
    this.checkinUserIds = this.checkinUserIds.map((id) => (id === anonymousUserId ? targetUserId : id));
    this.users = this.users.filter((u) => u.id !== anonymousUserId);

    const target = this.users.find((u) => u.id === targetUserId)!;
    target.anonymousDeviceId = deviceId;
    return target;
  }

  async updateAccountType(userId: string, accountType: AppUserRecord["accountType"]): Promise<AppUserRecord> {
    const user = this.users.find((u) => u.id === userId)!;
    user.accountType = accountType;
    return user;
  }
}

const VERIFIED: VerifiedAuthUser = {
  authUserId: "auth-1",
  authProvider: "email",
  email: "jane@example.com",
  phone: null,
};

describe("completeSignup", () => {
  it("creates a fresh authenticated row when no anonymous device history exists", async () => {
    const repo = new FakeAuthRepository();
    const user = await completeSignup(VERIFIED, "consumer", null, repo);

    expect(user.isAnonymous).toBe(false);
    expect(user.authUserId).toBe("auth-1");
    expect(user.email).toBe("jane@example.com");
  });

  it("converts the existing anonymous device row in place rather than migrating data", async () => {
    const repo = new FakeAuthRepository();
    const anon = repo.addAnonymousUser("device-1");

    const user = await completeSignup(VERIFIED, "consumer", "device-1", repo);

    expect(user.id).toBe(anon.id);
    expect(user.isAnonymous).toBe(false);
    expect(user.authUserId).toBe("auth-1");
    expect(repo.users).toHaveLength(1);
  });

  it("supports the business account variant", async () => {
    const repo = new FakeAuthRepository();
    const user = await completeSignup(VERIFIED, "business", null, repo);
    expect(user.accountType).toBe("business");
  });

  it("is idempotent for a repeat signup call by the same auth user", async () => {
    const repo = new FakeAuthRepository();
    const first = await completeSignup(VERIFIED, "consumer", null, repo);
    const second = await completeSignup(VERIFIED, "consumer", null, repo);

    expect(second.id).toBe(first.id);
    expect(repo.users).toHaveLength(1);
  });
});

describe("promoteToBusiness", () => {
  it("flips a consumer account to a business account in place", async () => {
    const repo = new FakeAuthRepository();
    const user = await completeSignup(VERIFIED, "consumer", null, repo);

    const promoted = await promoteToBusiness(user, repo);

    expect(promoted.id).toBe(user.id);
    expect(promoted.accountType).toBe("business");
    expect(repo.users).toHaveLength(1);
  });

  it("is a no-op for an account that's already a business account", async () => {
    const repo = new FakeAuthRepository();
    const user = await completeSignup(VERIFIED, "business", null, repo);

    const promoted = await promoteToBusiness(user, repo);
    expect(promoted).toBe(user);
  });
});

describe("completeLogin", () => {
  it("returns not_signed_up when no app_user row exists for the auth user", async () => {
    const repo = new FakeAuthRepository();
    const result = await completeLogin(VERIFIED, null, repo);
    expect(result).toEqual({ status: "not_signed_up" });
  });

  it("resolves the existing account with no device history to merge", async () => {
    const repo = new FakeAuthRepository();
    await completeSignup(VERIFIED, "consumer", null, repo);

    const result = await completeLogin(VERIFIED, null, repo);
    expect(result.status).toBe("ok");
  });

  it("merges a device's anonymous check-in history onto the account being logged into", async () => {
    const repo = new FakeAuthRepository();
    const account = await completeSignup(VERIFIED, "consumer", null, repo);
    const anon = repo.addAnonymousUser("device-1");
    repo.checkinUserIds.push(anon.id, anon.id);

    const result = await completeLogin(VERIFIED, "device-1", repo);

    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.user.id).toBe(account.id);
      expect(result.user.anonymousDeviceId).toBe("device-1");
    }
    // All check-ins that belonged to the anonymous row now belong to the
    // authenticated account, and the now-empty anonymous row is gone.
    expect(repo.checkinUserIds.every((id) => id === account.id)).toBe(true);
    expect(repo.users.find((u) => u.id === anon.id)).toBeUndefined();
  });

  it("does not merge when the device is already this account's own device", async () => {
    const repo = new FakeAuthRepository();
    const account = await completeSignup(VERIFIED, "consumer", "device-1", repo);

    const result = await completeLogin(VERIFIED, "device-1", repo);
    expect(result.status).toBe("ok");
    if (result.status === "ok") expect(result.user.id).toBe(account.id);
    expect(repo.users).toHaveLength(1);
  });

  it("does not merge when the device has no anonymous history at all", async () => {
    const repo = new FakeAuthRepository();
    const account = await completeSignup(VERIFIED, "consumer", null, repo);

    const result = await completeLogin(VERIFIED, "device-never-seen", repo);
    expect(result.status).toBe("ok");
    if (result.status === "ok") expect(result.user.id).toBe(account.id);
  });
});
