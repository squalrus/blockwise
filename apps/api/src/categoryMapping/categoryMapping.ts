import type { CategoryOption, VenueCategoryMapping, VenueStatus } from "@blockwise/types";
import type { CategoryMappingRepository, CategoryRecord, VenueCategoryRecord } from "./repository";

function toVenueCategoryMapping(record: VenueCategoryRecord): VenueCategoryMapping {
  return {
    id: record.id,
    name: record.name,
    address: record.address,
    category_id: record.categoryId,
    category_name: record.categoryName,
    category_group: record.categoryGroup,
    status: record.status,
    lat: record.lat,
    lng: record.lng,
    google_place_id: record.googlePlaceId,
  };
}

function toCategoryOption(record: CategoryRecord): CategoryOption {
  return { id: record.id, name: record.name, group_name: record.groupName };
}

export async function listVenueCategoryMappingsForNeighborhood(
  neighborhoodId: string,
  repository: CategoryMappingRepository,
  search?: string
): Promise<VenueCategoryMapping[]> {
  const venues = await repository.listVenuesForNeighborhood(neighborhoodId, search);
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

// Neighborhood-scoped counterpart of reassignVenueCategory -- rejects (as
// venue_not_found, same as a genuinely missing venue) before delegating to
// the existing reassignment logic, so a cross-neighborhood venue id can't be
// mutated from a different neighborhood's admin tab.
export async function reassignVenueCategoryForNeighborhood(
  neighborhoodId: string,
  venueId: string,
  categoryId: string,
  repository: CategoryMappingRepository
): Promise<ReassignVenueCategoryResult> {
  const venueNeighborhoodId = await repository.getVenueNeighborhoodId(venueId);
  if (venueNeighborhoodId !== neighborhoodId) return { status: "venue_not_found" };
  return reassignVenueCategory(venueId, categoryId, repository);
}

export type UpdateVenueStatusResult =
  | { status: "updated"; venue: VenueCategoryMapping }
  | { status: "venue_not_found" };

// Venue omission (BACKLOG.md Ref 11) -- same cross-neighborhood ownership
// check as reassignVenueCategoryForNeighborhood, so a venue id from a
// different neighborhood's admin tab can't be hidden/restored here either.
export async function updateVenueStatusForNeighborhood(
  neighborhoodId: string,
  venueId: string,
  newStatus: VenueStatus,
  repository: CategoryMappingRepository
): Promise<UpdateVenueStatusResult> {
  const venueNeighborhoodId = await repository.getVenueNeighborhoodId(venueId);
  if (venueNeighborhoodId !== neighborhoodId) return { status: "venue_not_found" };

  const updated = await repository.setVenueStatus(venueId, newStatus);
  return { status: "updated", venue: toVenueCategoryMapping(updated) };
}
