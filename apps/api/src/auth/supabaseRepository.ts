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

  // Not wrapped in a single DB transaction (no RPC/stored procedure defined
  // for it yet) -- same accepted-risk pattern as claims/supabaseRepository.ts
  // approveClaim at this project's scale. A failure between these steps
  // could leave check-ins reassigned without the device id moved over, but
  // never loses data.
  async mergeAnonymousHistory(
    targetUserId: string,
    anonymousUserId: string,
    deviceId: string
  ): Promise<AppUserRecord> {
    const { error: checkinError } = await this.supabase
      .from("checkin")
      .update({ user_id: targetUserId })
      .eq("user_id", anonymousUserId);

    if (checkinError) throw new Error(`mergeAnonymousHistory (checkins) failed: ${checkinError.message}`);

    const { error: deleteError } = await this.supabase
      .from("app_user")
      .delete()
      .eq("id", anonymousUserId);

    if (deleteError) throw new Error(`mergeAnonymousHistory (delete anon row) failed: ${deleteError.message}`);

    const { data, error: updateError } = await this.supabase
      .from("app_user")
      .update({ anonymous_device_id: deviceId })
      .eq("id", targetUserId)
      .select(USER_COLUMNS)
      .single();

    if (updateError) throw new Error(`mergeAnonymousHistory (attach device) failed: ${updateError.message}`);
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
