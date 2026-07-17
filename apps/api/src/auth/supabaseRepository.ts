import type { SupabaseClient } from "@supabase/supabase-js";
import type { AccountType, AvatarStyle, MushroomCustomization, ProfileVisibility } from "@blockwise/types";
import type { AppUserRecord, AuthRepository, CompleteSignupInput, UpdateProfileInput } from "./repository";
import { UsernameTakenError } from "./repository";

const USER_COLUMNS =
  "id, account_type, auth_user_id, auth_provider, email, phone, display_name, avatar_url, avatar_style, mushroom_customization, username, visibility, created_at";

// Postgres unique_violation.
const UNIQUE_VIOLATION = "23505";

function toRecord(row: {
  id: string;
  account_type: AccountType;
  auth_user_id: string | null;
  auth_provider: string | null;
  email: string | null;
  phone: string | null;
  display_name: string | null;
  avatar_url: string | null;
  avatar_style: AvatarStyle;
  mushroom_customization: MushroomCustomization | null;
  username: string | null;
  visibility: ProfileVisibility;
  created_at: string;
}): AppUserRecord {
  return {
    id: row.id,
    accountType: row.account_type,
    authUserId: row.auth_user_id,
    authProvider: row.auth_provider,
    email: row.email,
    phone: row.phone,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    avatarStyle: row.avatar_style,
    mushroomCustomization: row.mushroom_customization,
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
    const { data, error } = await this.supabase
      .from("app_user")
      .insert({
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
    if ("avatarStyle" in input) patch.avatar_style = input.avatarStyle;
    if ("mushroomCustomization" in input) patch.mushroom_customization = input.mushroomCustomization;
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
