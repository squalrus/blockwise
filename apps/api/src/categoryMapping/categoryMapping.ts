import type { CategoryOption, VenueCategoryMapping } from "@blockwise/types";
import type { CategoryMappingRepository, CategoryRecord, VenueCategoryRecord } from "./repository";

function toVenueCategoryMapping(record: VenueCategoryRecord): VenueCategoryMapping {
  return {
    id: record.id,
    name: record.name,
    address: record.address,
    category_id: record.categoryId,
    category_name: record.categoryName,
    category_group: record.categoryGroup,
  };
}

function toCategoryOption(record: CategoryRecord): CategoryOption {
  return { id: record.id, name: record.name, group_name: record.groupName };
}

export async function listVenueCategoryMappings(
  repository: CategoryMappingRepository,
  search?: string
): Promise<VenueCategoryMapping[]> {
  const venues = await repository.listVenues(search);
  return venues.map(toVenueCategoryMapping);
}

export async function listAssignableCategories(
  repository: CategoryMappingRepository
): Promise<CategoryOption[]> {
  const categories = await repository.listCategories();
  return categories.map(toCategoryOption);
}

export type ReassignVenueCategoryResult =
  | { status: "updated"; venue: VenueCategoryMapping }
  | { status: "venue_not_found" }
  | { status: "invalid_category" };

// README §2's "manual override capability in the admin tool for anything
// auto-mapped incorrectly" -- lets an admin correct a venue the sync's
// category-normalization step (README §1.4 step 3) mapped wrong, without a
// direct DB edit.
export async function reassignVenueCategory(
  venueId: string,
  categoryId: string,
  repository: CategoryMappingRepository
): Promise<ReassignVenueCategoryResult> {
  const venue = await repository.getVenue(venueId);
  if (!venue) return { status: "venue_not_found" };

  const category = await repository.getLeafCategory(categoryId);
  if (!category) return { status: "invalid_category" };

  const updated = await repository.updateVenueCategory(venueId, categoryId);
  return { status: "updated", venue: toVenueCategoryMapping(updated) };
}
