import { mushroomConfigForSpecies, mushroomSpeciesName } from "@blockwise/types";
import type { MushroomCollectionEntry } from "@blockwise/types";
import type { MushroomCollectionListItem, MushroomCollectionRepository } from "./repository";

function toEntry(item: MushroomCollectionListItem): MushroomCollectionEntry {
  return {
    id: item.id,
    source_type: item.sourceType,
    source_id: item.sourceId,
    source_name: item.sourceName,
    source_slug: item.sourceSlug,
    species_name: mushroomSpeciesName(item.sourceId),
    mushroom: mushroomConfigForSpecies(item.sourceId),
    quantity: item.quantity,
    first_collected_at: item.firstCollectedAt,
    revealed: item.revealedAt !== null,
  };
}

// GET /me/collection (BACKLOG.md Ref 98) -- the look/flavor-name are
// derived here rather than stored, so they can't drift from
// mushroomConfigForSpecies/mushroomSpeciesName if those ever change.
export async function getMushroomCollectionForUser(
  userId: string,
  repository: MushroomCollectionRepository
): Promise<MushroomCollectionEntry[]> {
  const items = await repository.listCollectionForUser(userId);
  return items.map(toEntry);
}

// POST /me/collection/:id/reveal -- flips the persisted revealed_at flag on
// a single entry (idempotent, ownership-scoped by the repository). Null
// means no such entry for this user, which the caller (app.ts) turns into a
// 404 rather than leaking whether the id exists for someone else.
export async function revealMushroomCollectionEntry(
  userId: string,
  entryId: string,
  repository: MushroomCollectionRepository
): Promise<MushroomCollectionEntry | null> {
  const item = await repository.revealCollectionItem(userId, entryId);
  return item ? toEntry(item) : null;
}
