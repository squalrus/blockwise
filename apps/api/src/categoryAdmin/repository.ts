import type { CategoryStatus } from "@blockwise/types";

export interface CategoryAdminRecord {
  id: string;
  name: string;
  parentCategoryId: string | null;
  status: CategoryStatus;
  googleTypes: string[];
}

// Abstracts persistence so categoryAdmin.ts's create/rename/archive logic can
// be tested against an in-memory fake, mirroring categoryMapping/repository.ts.
export interface CategoryAdminRepository {
  // All categories, including archived ones and top-level groups -- the
  // admin taxonomy view needs the full picture, unlike
  // CategoryMappingRepository.listCategories() which only surfaces
  // assignable (active, leaf) categories.
  listAll(): Promise<CategoryAdminRecord[]>;
  getCategory(id: string): Promise<{ id: string; parentCategoryId: string | null } | null>;
  createCategory(
    name: string,
    parentCategoryId: string | null,
    googleTypes: string[]
  ): Promise<CategoryAdminRecord>;
  renameCategory(id: string, name: string): Promise<CategoryAdminRecord>;
  archiveCategory(id: string): Promise<CategoryAdminRecord>;
  // Guards for archiveCategory: refuse to archive a category still assigned
  // to a venue, or a group row that still has active leaf children.
  countVenuesUsingCategory(categoryId: string): Promise<number>;
  countActiveChildCategories(categoryId: string): Promise<number>;
}
