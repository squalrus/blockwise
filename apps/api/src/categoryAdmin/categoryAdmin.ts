import type { CategoryAdminItem } from "@blockwise/types";
import type { CategoryAdminRecord, CategoryAdminRepository } from "./repository";

function toCategoryAdminItem(record: CategoryAdminRecord): CategoryAdminItem {
  return {
    id: record.id,
    name: record.name,
    parent_category_id: record.parentCategoryId,
    status: record.status,
    google_types: record.googleTypes,
  };
}

export async function listCategoriesForAdmin(repository: CategoryAdminRepository): Promise<CategoryAdminItem[]> {
  const records = await repository.listAll();
  return records.map(toCategoryAdminItem);
}

export type CreateCategoryResult =
  | { status: "created"; category: CategoryAdminItem }
  | { status: "invalid_name" }
  | { status: "invalid_parent" };

export async function createCategory(
  name: string,
  parentCategoryId: string | null,
  googleTypes: string[],
  repository: CategoryAdminRepository
): Promise<CreateCategoryResult> {
  const trimmedName = name.trim();
  if (!trimmedName) return { status: "invalid_name" };

  if (parentCategoryId) {
    const parent = await repository.getCategory(parentCategoryId);
    // Only a top-level group (itself parentless) is a valid parent -- the
    // taxonomy is two levels deep, mirroring category_taxonomy.sql's seed.
    if (!parent || parent.parentCategoryId !== null) return { status: "invalid_parent" };
  }

  const created = await repository.createCategory(trimmedName, parentCategoryId, googleTypes);
  return { status: "created", category: toCategoryAdminItem(created) };
}

export type RenameCategoryResult =
  | { status: "renamed"; category: CategoryAdminItem }
  | { status: "not_found" }
  | { status: "invalid_name" };

export async function renameCategory(
  id: string,
  name: string,
  repository: CategoryAdminRepository
): Promise<RenameCategoryResult> {
  const trimmedName = name.trim();
  if (!trimmedName) return { status: "invalid_name" };

  const existing = await repository.getCategory(id);
  if (!existing) return { status: "not_found" };

  const updated = await repository.renameCategory(id, trimmedName);
  return { status: "renamed", category: toCategoryAdminItem(updated) };
}

export type ArchiveCategoryResult =
  | { status: "archived"; category: CategoryAdminItem }
  | { status: "not_found" }
  | { status: "in_use"; venueCount: number }
  | { status: "has_children"; childCount: number };

// Guards against orphaning venues (BACKLOG.md Ref 4's "guard against
// orphaning venues currently assigned to a category being archived") and,
// symmetrically, against orphaning a group's own leaf children in the
// taxonomy tree.
export async function archiveCategory(
  id: string,
  repository: CategoryAdminRepository
): Promise<ArchiveCategoryResult> {
  const existing = await repository.getCategory(id);
  if (!existing) return { status: "not_found" };

  const venueCount = await repository.countVenuesUsingCategory(id);
  if (venueCount > 0) return { status: "in_use", venueCount };

  const childCount = await repository.countActiveChildCategories(id);
  if (childCount > 0) return { status: "has_children", childCount };

  const archived = await repository.archiveCategory(id);
  return { status: "archived", category: toCategoryAdminItem(archived) };
}
