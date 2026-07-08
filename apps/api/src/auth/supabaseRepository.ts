import type { SupabaseClient } from "@supabase/supabase-js";
import type { AccountType, ProfileVisibility } from "@blockwise/types";
import type { AppUserRecord, AuthRepository, CompleteSignupInput, UpdateProfileInput } from "./repository";
import { UsernameTakenError } from "./repository";

const USER_COLUMNS =
  "id, is_anonymous, account_type, auth_user_id, auth_provider, email, phone, anonymous_device_id, display_name, avatar_url, username, visibility, created_at";

// Postgres unique_violation.
const UNIQUE_VIOLATION = "23505";

function toRecord(row: {
  id: string;
  is_anonymous: boolean;
  account_type: AccountType;
  auth_user_id: string | null;
  auth_provider: string | null;
  email: string | null;
  phone: string | null;
  anonymous_device_id: string | null;
  display_name: string | null;
  avatar_url: string | null;
  username: string | null;
  visibility: ProfileVisibility;
  created_at: string;
}): AppUserRecord {
  return {
    id: row.id,
    isAnonymous: row.is_anonymous,
    accountType: row.account_type,
    authUserId: row.auth_user_id,
    authProvider: row.auth_provider,
    email: row.email,
    phone: row.phone,
    anonymousDeviceId: row.anonymous_device_id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    username: row.username,
    visibility: row.visibility,
    createdAt: row.created_at,
  };
}

export class SupabaseAuthRepository implements AuthRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async getByAuthUserId(authUserId: string): Promise<AppUserRecord | null> {
    const { data, error } = await this.supabase
      .from("app_user")
      .select(USER_COLUMNS)
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    if (error) throw new Error(`getByAuthUserId failed: ${error.message}`);
    return data ? toRecord(data) : null;
  }

  async getByAnonymousDeviceId(deviceId: string): Promise<AppUserRecord | null> {
    const { data, error } = await this.supabase
      .from("app_user")
      .select(USER_COLUMNS)
      .eq("anonymous_device_id", deviceId)
      .maybeSingle();

    if (error) throw new Error(`getByAnonymousDeviceId failed: ${error.message}`);
    return data ? toRecord(data) : null;
  }

  async getByUsername(username: string): Promise<AppUserRecord | null> {
    const { data, error } = await this.supabase
      .from("app_user")
      .select(USER_COLUMNS)
      .eq("username", username)
      .maybeSingle();

    if (error) throw new Error(`getByUsername failed: ${error.message}`);
    return data ? toRecord(data) : null;
  }

  async completeSignup(input: CompleteSignupInput): Promise<AppUserRecord> {
    if (input.anonymousDeviceId) {
      const deviceUser = await this.getByAnonymousDeviceId(input.anonymousDeviceId);
      // Only convert the device's row in place if it's still anonymous --
      // if it's already tied to a different auth user (e.g. a shared or
      // reset device), fall through and create a fresh row rather than
      // stealing someone else's identity.
      if (deviceUser && deviceUser.isAnonymous) {
        const { data, error } = await this.supabase
          .from("app_user")
          .update({
            is_anonymous: false,
            account_type: input.accountType,
            auth_user_id: input.authUserId,
            auth_provider: input.authProvider,
            email: input.email,
            phone: input.phone,
            avatar_url: input.avatarUrl,
          })
          .eq("id", deviceUser.id)
          .select(USER_COLUMNS)
          .single();

        if (error) throw new Error(`completeSignup (link) failed: ${error.message}`);
        return toRecord(data);
      }
    }

    const { data, error } = await this.supabase
      .from("app_user")
      .insert({
        is_anonymous: false,
        account_type: input.accountType,
        auth_user_id: input.authUserId,
        auth_provider: input.authProvider,
        email: input.email,
        phone: input.phone,
        avatar_url: input.avatarUrl,
      })
      .select(USER_COLUMNS)
      .single();

    if (error) throw new Error(`completeSignup (create) failed: ${error.message}`);
    return toRecord(data);
  }

  // Delegates to the merge_anonymous_user_history() DB function
  // (supabase/migrations/20260708000000_fix_merge_anonymous_history_data_loss.sql)
  // so the checkin/point_event/favorite/user_badge/user_challenge_completion
  // reassignment and the anonymous row's deletion happen in one transaction.
  // A prior version did this as separate client calls and deleted the
  // anonymous app_user row without migrating point_event/favorite/user_badge/
  // user_challenge_completion first, which cascade-deleted them (all
  // "on delete cascade" against app_user) and silently lost the device's
  // earned points/badges.
  async mergeAnonymousHistory(
    targetUserId: string,
    anonymousUserId: string,
    deviceId: string
  ): Promise<AppUserRecord> {
    const { error: mergeError } = await this.supabase.rpc("merge_anonymous_user_history", {
      p_target_user_id: targetUserId,
      p_anonymous_user_id: anonymousUserId,
      p_device_id: deviceId,
    });

    if (mergeError) throw new Error(`mergeAnonymousHistory failed: ${mergeError.message}`);

    const { data, error } = await this.supabase
      .from("app_user")
      .select(USER_COLUMNS)
      .eq("id", targetUserId)
      .single();

    if (error) throw new Error(`mergeAnonymousHistory (reload) failed: ${error.message}`);
    return toRecord(data);
  }

  async updateAccountType(userId: string, accountType: AccountType): Promise<AppUserRecord> {
    const { data, error } = await this.supabase
      .from("app_user")
      .update({ account_type: accountType })
      .eq("id", userId)
      .select(USER_COLUMNS)
      .single();

    if (error) throw new Error(`updateAccountType failed: ${error.message}`);
    return toRecord(data);
  }

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<AppUserRecord> {
    const patch: Record<string, unknown> = {};
    if ("displayName" in input) patch.display_name = input.displayName;
    if ("avatarUrl" in input) patch.avatar_url = input.avatarUrl;
    if ("username" in input) patch.username = input.username;
    if ("visibility" in input) patch.visibility = input.visibility;

    const { data, error } = await this.supabase
      .from("app_user")
      .update(patch)
      .eq("id", userId)
      .select(USER_COLUMNS)
      .single();

    if (error) {
      if (error.code === UNIQUE_VIOLATION) throw new UsernameTakenError(String(input.username));
      throw new Error(`updateProfile failed: ${error.message}`);
    }
    return toRecord(data);
  }
}
