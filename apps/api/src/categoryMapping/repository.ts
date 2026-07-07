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
  // Matches against venue name/address when provided -- unfiltered listing
  // would be unusable once a neighborhood has hundreds of venues (README §1.4
  // synced 229 for Phinneywood alone).
  listVenues(search?: string): Promise<VenueCategoryRecord[]>;
  // Only leaf categories (those with a parent_category_id) -- the 6
  // top-level group rows are organizational only and were never meant to be
  // assigned to a venue directly.
  listCategories(): Promise<CategoryRecord[]>;
  getVenue(venueId: string): Promise<{ id: string } | null>;
  getLeafCategory(categoryId: string): Promise<{ id: string } | null>;
  updateVenueCategory(venueId: string, categoryId: string): Promise<VenueCategoryRecord>;
}
