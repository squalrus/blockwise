import { describe, expect, it } from "vitest";
import { completeLogin, completeSignup, promoteToBusiness, updateProfile } from "./auth";
import { UsernameTakenError } from "./repository";
import type { AppUserRecord, AuthRepository, CompleteSignupInput, UpdateProfileInput } from "./repository";
import type { VerifiedAuthUser } from "./verifyToken";

// In-memory fake, mirroring the pattern used for CheckinRepository/
// ClaimRepository tests.
class FakeAuthRepository implements AuthRepository {
  users: AppUserRecord[] = [];
  private nextId = 1;

  async getByAuthUserId(authUserId: string): Promise<AppUserRecord | null> {
    return this.users.find((u) => u.authUserId === authUserId) ?? null;
  }

  async getByUsername(username: string): Promise<AppUserRecord | null> {
    return this.users.find((u) => u.username === username) ?? null;
  }

  async completeSignup(input: CompleteSignupInput): Promise<AppUserRecord> {
    const created: AppUserRecord = {
      id: `user-${this.nextId++}`,
      accountType: input.accountType,
      authUserId: input.authUserId,
      authProvider: input.authProvider,
      email: input.email,
      phone: input.phone,
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
  it("creates a fresh authenticated row", async () => {
    const repo = new FakeAuthRepository();
    const user = await completeSignup(VERIFIED, "consumer", repo);

    expect(user.authUserId).toBe("auth-1");
    expect(user.email).toBe("jane@example.com");
  });

  it("supports the business account variant", async () => {
    const repo = new FakeAuthRepository();
    const user = await completeSignup(VERIFIED, "business", repo);
    expect(user.accountType).toBe("business");
  });

  it("is idempotent for a repeat signup call by the same auth user", async () => {
    const repo = new FakeAuthRepository();
    const first = await completeSignup(VERIFIED, "consumer", repo);
    const second = await completeSignup(VERIFIED, "consumer", repo);

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

    const user = await completeSignup(googleVerified, "consumer", repo);
    expect(user.avatarUrl).toBe("https://lh3.googleusercontent.com/a/photo.jpg");
  });

  it("leaves avatar_url null for a non-OAuth signup", async () => {
    const repo = new FakeAuthRepository();
    const user = await completeSignup(VERIFIED, "consumer", repo);
    expect(user.avatarUrl).toBeNull();
  });
});

describe("updateProfile", () => {
  it("sets display name, avatar style, and visibility", async () => {
    const repo = new FakeAuthRepository();
    const user = await completeSignup(VERIFIED, "consumer", repo);

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
    const user = await completeSignup(VERIFIED, "consumer", repo);
    expect(user.visibility).toBe("public");
  });

  it("leaves fields not present in the input unchanged", async () => {
    const repo = new FakeAuthRepository();
    const user = await completeSignup(VERIFIED, "consumer", repo);
    await updateProfile(user, { displayName: "Jane", visibility: "public" }, repo);

    const updated = await updateProfile(user, { avatarStyle: "mushroom" }, repo);

    expect(updated.displayName).toBe("Jane");
    expect(updated.visibility).toBe("public");
    expect(updated.avatarStyle).toBe("mushroom");
  });

  it("treats a blank display name as clearing it rather than storing an empty string", async () => {
    const repo = new FakeAuthRepository();
    const user = await completeSignup(VERIFIED, "consumer", repo);
    await updateProfile(user, { displayName: "Jane" }, repo);

    const updated = await updateProfile(user, { displayName: "   " }, repo);

    expect(updated.displayName).toBeNull();
  });

  it("saves and clears a mushroom customization (BACKLOG.md Ref 75)", async () => {
    const repo = new FakeAuthRepository();
    const user = await completeSignup(VERIFIED, "consumer", repo);

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
    const user = await completeSignup(VERIFIED, "consumer", repo);
    expect(user.avatarStyle).toBe("mushroom");

    const toSocial = await updateProfile(user, { avatarStyle: "social" }, repo);
    expect(toSocial.avatarStyle).toBe("social");

    const backToMushroom = await updateProfile(user, { avatarStyle: "mushroom" }, repo);
    expect(backToMushroom.avatarStyle).toBe("mushroom");
  });

  it("lowercases and trims a username (BACKLOG.md 'Public user profiles')", async () => {
    const repo = new FakeAuthRepository();
    const user = await completeSignup(VERIFIED, "consumer", repo);

    const updated = await updateProfile(user, { username: "  Jane-Doe_2  " }, repo);
    expect(updated.username).toBe("jane-doe_2");
  });

  it("treats a blank username as clearing it", async () => {
    const repo = new FakeAuthRepository();
    const user = await completeSignup(VERIFIED, "consumer", repo);
    await updateProfile(user, { username: "janedoe" }, repo);

    const updated = await updateProfile(user, { username: "   " }, repo);
    expect(updated.username).toBeNull();
  });

  it("rejects a username already taken by another account", async () => {
    const repo = new FakeAuthRepository();
    const user1 = await completeSignup(VERIFIED, "consumer", repo);
    const otherVerified: VerifiedAuthUser = { ...VERIFIED, authUserId: "auth-2" };
    const user2 = await completeSignup(otherVerified, "consumer", repo);
    await updateProfile(user1, { username: "janedoe" }, repo);

    await expect(updateProfile(user2, { username: "janedoe" }, repo)).rejects.toThrow(UsernameTakenError);
  });
});

describe("promoteToBusiness", () => {
  it("flips a consumer account to a business account in place", async () => {
    const repo = new FakeAuthRepository();
    const user = await completeSignup(VERIFIED, "consumer", repo);

    const promoted = await promoteToBusiness(user, repo);

    expect(promoted.id).toBe(user.id);
    expect(promoted.accountType).toBe("business");
    expect(repo.users).toHaveLength(1);
  });

  it("is a no-op for an account that's already a business account", async () => {
    const repo = new FakeAuthRepository();
    const user = await completeSignup(VERIFIED, "business", repo);

    const promoted = await promoteToBusiness(user, repo);
    expect(promoted).toBe(user);
  });
});

describe("completeLogin", () => {
  it("returns not_signed_up when no app_user row exists for the auth user", async () => {
    const repo = new FakeAuthRepository();
    const result = await completeLogin(VERIFIED, repo);
    expect(result).toEqual({ status: "not_signed_up" });
  });

  it("resolves the existing account for a signed-up auth user", async () => {
    const repo = new FakeAuthRepository();
    const account = await completeSignup(VERIFIED, "consumer", repo);

    const result = await completeLogin(VERIFIED, repo);
    expect(result.status).toBe("ok");
    if (result.status === "ok") expect(result.user.id).toBe(account.id);
  });
});
