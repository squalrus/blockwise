import { mushroomConfigForSpecies, mushroomSpeciesName } from "@blockwise/types";
import type { MushroomCollectionEntry } from "@blockwise/types";
import type { MushroomCollectionListItem, MushroomCollectionRepository } from "./repository";

function toEntry(item: MushroomCollectionListItem): MushroomCollectionEntry {
  return {
    id: item.id,
    source_type: item.sourceType,
    source_id: item.sourceId,
    source_name: item.sourceName,
    species_name: mushroomSpeciesName(item.sourceId),
    mushroom: mushroomConfigForSpecies(item.sourceId),
    quantity: item.quantity,
    first_collected_at: item.firstCollectedAt,
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
