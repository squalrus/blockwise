export interface VenueCategoryRecord {
  id: string;
  name: string;
  address: string;
  categoryId: string | null;
  categoryName: string | null;
  categoryGroup: string | null;
}

export interface CategoryRecord {
  id: string;
  name: string;
  groupName: string | null;
}

// Abstracts persistence so reassignVenueCategory (categoryMapping.ts) can be
// tested against an in-memory fake, mirroring claims/repository.ts.
export interface CategoryMappingRepository {
  // Neighborhood-scoped counterpart of the old global listVenues -- matches
  // against venue name/address when provided, same reasoning as the global
  // version (README §1.4 synced 229 venues for Phinneywood alone), but
  // restricted to one neighborhood per the "combine claims + venues into
  // neighborhood admin" refactor (docs/url-map.md).
  listVenuesForNeighborhood(neighborhoodId: string, search?: string): Promise<VenueCategoryRecord[]>;
  // Backs reassignVenueCategoryForNeighborhood's ownership check -- null if
  // the venue doesn't exist.
  getVenueNeighborhoodId(venueId: string): Promise<string | null>;
  // Only leaf categories (those with a parent_category_id) -- the 6
  // top-level group rows are organizational only and were never meant to be
  // assigned to a venue directly.
  listCategories(): Promise<CategoryRecord[]>;
  getVenue(venueId: string): Promise<{ id: string } | null>;
  getLeafCategory(categoryId: string): Promise<{ id: string } | null>;
  updateVenueCategory(venueId: string, categoryId: string): Promise<VenueCategoryRecord>;
}
