import { describe, expect, it } from "vitest";
import { completeLogin, completeSignup, promoteToBusiness, updateProfile } from "./auth";
import { UsernameTakenError } from "./repository";
import type { AppUserRecord, AuthRepository, CompleteSignupInput, UpdateProfileInput } from "./repository";
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
      displayName: null,
      avatarUrl: null,
      avatarStyle: "mushroom",
      mushroomCustomization: null,
      username: null,
      visibility: "public",
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

  async getByUsername(username: string): Promise<AppUserRecord | null> {
    return this.users.find((u) => u.username === username) ?? null;
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
      deviceUser.avatarUrl = input.avatarUrl;
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
      anonymousDeviceId: deviceUser ? null : input.anonymousDeviceId,
      displayName: null,
      avatarUrl: input.avatarUrl,
      avatarStyle: "mushroom",
      mushroomCustomization: null,
      username: null,
      visibility: "public",
      createdAt: new Date().toISOString(),
    };
    this.users.push(created);
    return created;
  }

  async linkDevice(userId: string, deviceId: string): Promise<AppUserRecord> {
    const user = this.users.find((u) => u.id === userId)!;
    user.anonymousDeviceId = deviceId;
    return user;
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

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<AppUserRecord> {
    const user = this.users.find((u) => u.id === userId)!;
    if ("username" in input && input.username && this.users.some((u) => u.id !== userId && u.username === input.username)) {
      throw new UsernameTakenError(input.username);
    }
    if ("displayName" in input) user.displayName = input.displayName ?? null;
    if ("avatarStyle" in input) user.avatarStyle = input.avatarStyle!;
    if ("mushroomCustomization" in input) user.mushroomCustomization = input.mushroomCustomization ?? null;
    if ("username" in input) user.username = input.username ?? null;
    if ("visibility" in input) user.visibility = input.visibility!;
    return user;
  }
}

const VERIFIED: VerifiedAuthUser = {
  authUserId: "auth-1",
  authProvider: "email",
  email: "jane@example.com",
  phone: null,
  avatarUrl: null,
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

  it("seeds avatar_url from the OAuth provider's picture on a fresh Google signup (BACKLOG.md Ref 34)", async () => {
    const repo = new FakeAuthRepository();
    const googleVerified: VerifiedAuthUser = {
      ...VERIFIED,
      authProvider: "google",
      avatarUrl: "https://lh3.googleusercontent.com/a/photo.jpg",
    };

    const user = await completeSignup(googleVerified, "consumer", null, repo);
    expect(user.avatarUrl).toBe("https://lh3.googleusercontent.com/a/photo.jpg");
  });

  it("leaves avatar_url null for a non-OAuth signup", async () => {
    const repo = new FakeAuthRepository();
    const user = await completeSignup(VERIFIED, "consumer", null, repo);
    expect(user.avatarUrl).toBeNull();
  });
});

describe("updateProfile", () => {
  it("sets display name, avatar style, and visibility", async () => {
    const repo = new FakeAuthRepository();
    const user = await completeSignup(VERIFIED, "consumer", null, repo);

    const updated = await updateProfile(
      user,
      { displayName: "Jane", avatarStyle: "mushroom", visibility: "public" },
      repo
    );

    expect(updated.displayName).toBe("Jane");
    expect(updated.avatarStyle).toBe("mushroom");
    expect(updated.visibility).toBe("public");
  });

  it("defaults to public visibility on signup, before any profile edit", async () => {
    const repo = new FakeAuthRepository();
    const user = await completeSignup(VERIFIED, "consumer", null, repo);
    expect(user.visibility).toBe("public");
  });

  it("leaves fields not present in the input unchanged", async () => {
    const repo = new FakeAuthRepository();
    const user = await completeSignup(VERIFIED, "consumer", null, repo);
    await updateProfile(user, { displayName: "Jane", visibility: "public" }, repo);

    const updated = await updateProfile(user, { avatarStyle: "mushroom" }, repo);

    expect(updated.displayName).toBe("Jane");
    expect(updated.visibility).toBe("public");
    expect(updated.avatarStyle).toBe("mushroom");
  });

  it("treats a blank display name as clearing it rather than storing an empty string", async () => {
    const repo = new FakeAuthRepository();
    const user = await completeSignup(VERIFIED, "consumer", null, repo);
    await updateProfile(user, { displayName: "Jane" }, repo);

    const updated = await updateProfile(user, { displayName: "   " }, repo);

    expect(updated.displayName).toBeNull();
  });

  it("saves and clears a mushroom customization (BACKLOG.md Ref 75)", async () => {
    const repo = new FakeAuthRepository();
    const user = await completeSignup(VERIFIED, "consumer", null, repo);

    const customized = await updateProfile(
      user,
      {
        mushroomCustomization: {
          cap: "#8b5fbf",
          stalk: "#2b1b12",
          spots: "#fbf2e4",
          bg: "#c9b3e0",
          spotCount: 2,
          spotShape: "ring",
        },
      },
      repo
    );
    expect(customized.mushroomCustomization).toEqual({
      cap: "#8b5fbf",
      stalk: "#2b1b12",
      spots: "#fbf2e4",
      bg: "#c9b3e0",
      spotCount: 2,
      spotShape: "ring",
    });

    const cleared = await updateProfile(user, { mushroomCustomization: null }, repo);
    expect(cleared.mushroomCustomization).toBeNull();
  });

  it("switches avatar style back and forth (mushroom <-> social)", async () => {
    const repo = new FakeAuthRepository();
    const user = await completeSignup(VERIFIED, "consumer", null, repo);
    expect(user.avatarStyle).toBe("mushroom");

    const toSocial = await updateProfile(user, { avatarStyle: "social" }, repo);
    expect(toSocial.avatarStyle).toBe("social");

    const backToMushroom = await updateProfile(user, { avatarStyle: "mushroom" }, repo);
    expect(backToMushroom.avatarStyle).toBe("mushroom");
  });

  it("lowercases and trims a username (BACKLOG.md 'Public user profiles')", async () => {
    const repo = new FakeAuthRepository();
    const user = await completeSignup(VERIFIED, "consumer", null, repo);

    const updated = await updateProfile(user, { username: "  Jane-Doe_2  " }, repo);
    expect(updated.username).toBe("jane-doe_2");
  });

  it("treats a blank username as clearing it", async () => {
    const repo = new FakeAuthRepository();
    const user = await completeSignup(VERIFIED, "consumer", null, repo);
    await updateProfile(user, { username: "janedoe" }, repo);

    const updated = await updateProfile(user, { username: "   " }, repo);
    expect(updated.username).toBeNull();
  });

  it("rejects a username already taken by another account", async () => {
    const repo = new FakeAuthRepository();
    const user1 = await completeSignup(VERIFIED, "consumer", null, repo);
    const otherVerified: VerifiedAuthUser = { ...VERIFIED, authUserId: "auth-2" };
    const user2 = await completeSignup(otherVerified, "consumer", null, repo);
    await updateProfile(user1, { username: "janedoe" }, repo);

    await expect(updateProfile(user2, { username: "janedoe" }, repo)).rejects.toThrow(UsernameTakenError);
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

  it("links a device with no anonymous history at all, so future check-ins from it attribute to the account", async () => {
    const repo = new FakeAuthRepository();
    const account = await completeSignup(VERIFIED, "consumer", null, repo);

    const result = await completeLogin(VERIFIED, "device-never-seen", repo);
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.user.id).toBe(account.id);
      expect(result.user.anonymousDeviceId).toBe("device-never-seen");
    }
    expect(repo.users).toHaveLength(1);
  });

  it("does not steal a device already linked to a different authenticated account", async () => {
    const repo = new FakeAuthRepository();
    const otherVerified: VerifiedAuthUser = { ...VERIFIED, authUserId: "auth-other" };
    const other = await completeSignup(otherVerified, "consumer", "device-1", repo);
    await completeSignup(VERIFIED, "consumer", null, repo);

    const result = await completeLogin(VERIFIED, "device-1", repo);
    expect(result.status).toBe("ok");
    if (result.status === "ok") expect(result.user.id).not.toBe(other.id);
    expect(other.anonymousDeviceId).toBe("device-1");
  });
});
