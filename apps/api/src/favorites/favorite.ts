import type { Favorite } from "@blockwise/types";
import type { FavoriteRecord, FavoriteRepository } from "./repository";

function toFavorite(record: FavoriteRecord): Favorite {
  return {
    id: record.id,
    user_id: record.userId,
    venue_id: record.venueId,
    created_at: record.createdAt,
  };
}

export type AddFavoriteResult =
  | { status: "created" | "already_favorited"; favorite: Favorite }
  | { status: "not_found" };

export async function addFavorite(
  venueId: string,
  userId: string,
  repository: FavoriteRepository
): Promise<AddFavoriteResult> {
  if (!(await repository.venueExists(venueId))) return { status: "not_found" };

  const existing = await repository.getFavorite(userId, venueId);
  if (existing) return { status: "already_favorited", favorite: toFavorite(existing) };

  const created = await repository.createFavorite(userId, venueId);
  return { status: "created", favorite: toFavorite(created) };
}

export type RemoveFavoriteResult = { status: "removed" | "not_found" };

export async function removeFavorite(
  venueId: string,
  userId: string,
  repository: FavoriteRepository
): Promise<RemoveFavoriteResult> {
  if (!(await repository.venueExists(venueId))) return { status: "not_found" };

  await repository.deleteFavorite(userId, venueId);
  return { status: "removed" };
}

export type FavoriteStatusResult =
  | { status: "found"; favorited: boolean }
  | { status: "not_found" };

export async function getFavoriteStatus(
  venueId: string,
  userId: string,
  repository: FavoriteRepository
): Promise<FavoriteStatusResult> {
  if (!(await repository.venueExists(venueId))) return { status: "not_found" };

  const existing = await repository.getFavorite(userId, venueId);
  return { status: "found", favorited: existing !== null };
}
