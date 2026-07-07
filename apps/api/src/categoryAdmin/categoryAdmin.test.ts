import { describe, expect, it } from "vitest";
import { archiveCategory, createCategory, listCategoriesForAdmin, renameCategory } from "./categoryAdmin";
import type { CategoryAdminRecord, CategoryAdminRepository } from "./repository";

// In-memory fake, mirroring the pattern used for categoryMapping.test.ts.
class FakeCategoryAdminRepository implements CategoryAdminRepository {
  constructor(private readonly categories: CategoryAdminRecord[]) {}

  async listAll(): Promise<CategoryAdminRecord[]> {
    return this.categories;
  }

  async getCategory(id: string): Promise<{ id: string; parentCategoryId: string | null } | null> {
    const category = this.categories.find((c) => c.id === id);
    return category ? { id: category.id, parentCategoryId: category.parentCategoryId } : null;
  }

  async createCategory(
    name: string,
    parentCategoryId: string | null,
    googleTypes: string[]
  ): Promise<CategoryAdminRecord> {
    const created: CategoryAdminRecord = {
      id: `cat-${this.categories.length + 1}`,
      name,
      parentCategoryId,
      status: "active",
      googleTypes,
    };
    this.categories.push(created);
    return created;
  }

  async renameCategory(id: string, name: string): Promise<CategoryAdminRecord> {
    const category = this.categories.find((c) => c.id === id)!;
    category.name = name;
    return category;
  }

  async archiveCategory(id: string): Promise<CategoryAdminRecord> {
    const category = this.categories.find((c) => c.id === id)!;
    category.status = "archived";
    return category;
  }

  async countVenuesUsingCategory(categoryId: string): Promise<number> {
    return this.venueCounts.get(categoryId) ?? 0;
  }

  async countActiveChildCategories(categoryId: string): Promise<number> {
    return this.categories.filter((c) => c.parentCategoryId === categoryId && c.status === "active").length;
  }

  venueCounts = new Map<string, number>();
}

const GROUP: CategoryAdminRecord = {
  id: "group-food",
  name: "Food & Drink",
  parentCategoryId: null,
  status: "active",
  googleTypes: [],
};

const LEAF: CategoryAdminRecord = {
  id: "leaf-cafe",
  name: "Coffee Shop",
  parentCategoryId: "group-food",
  status: "active",
  googleTypes: ["cafe"],
};

describe("listCategoriesForAdmin", () => {
  it("returns all categories, mapped to snake_case DTOs", async () => {
    const repo = new FakeCategoryAdminRepository([GROUP, LEAF]);
    const result = await listCategoriesForAdmin(repo);
    expect(result).toEqual([
      { id: "group-food", name: "Food & Drink", parent_category_id: null, status: "active", google_types: [] },
      { id: "leaf-cafe", name: "Coffee Shop", parent_category_id: "group-food", status: "active", google_types: ["cafe"] },
    ]);
  });
});

describe("createCategory", () => {
  it("rejects an empty name", async () => {
    const repo = new FakeCategoryAdminRepository([GROUP]);
    const result = await createCategory("   ", null, [], repo);
    expect(result).toEqual({ status: "invalid_name" });
  });

  it("rejects a parent that doesn't exist", async () => {
    const repo = new FakeCategoryAdminRepository([GROUP]);
    const result = await createCategory("Tea House", "missing-group", [], repo);
    expect(result).toEqual({ status: "invalid_parent" });
  });

  it("rejects a parent that is itself a leaf (no nesting beyond two levels)", async () => {
    const repo = new FakeCategoryAdminRepository([GROUP, LEAF]);
    const result = await createCategory("Espresso Bar", "leaf-cafe", [], repo);
    expect(result).toEqual({ status: "invalid_parent" });
  });

  it("creates a new top-level group when parent_category_id is null", async () => {
    const repo = new FakeCategoryAdminRepository([GROUP]);
    const result = await createCategory("Nightlife", null, [], repo);
    expect(result.status).toBe("created");
    if (result.status === "created") {
      expect(result.category).toMatchObject({ name: "Nightlife", parent_category_id: null, status: "active" });
    }
  });

  it("creates a new leaf under an existing group", async () => {
    const repo = new FakeCategoryAdminRepository([GROUP]);
    const result = await createCategory("Tea House", "group-food", ["cafe", "tea_house"], repo);
    expect(result.status).toBe("created");
    if (result.status === "created") {
      expect(result.category).toMatchObject({
        name: "Tea House",
        parent_category_id: "group-food",
        google_types: ["cafe", "tea_house"],
      });
    }
  });
});

describe("renameCategory", () => {
  it("returns not_found for an unknown category", async () => {
    const repo = new FakeCategoryAdminRepository([GROUP]);
    const result = await renameCategory("missing", "New Name", repo);
    expect(result).toEqual({ status: "not_found" });
  });

  it("rejects an empty name", async () => {
    const repo = new FakeCategoryAdminRepository([GROUP]);
    const result = await renameCategory("group-food", "  ", repo);
    expect(result).toEqual({ status: "invalid_name" });
  });

  it("renames the category", async () => {
    const repo = new FakeCategoryAdminRepository([GROUP]);
    const result = await renameCategory("group-food", "Food & Beverage", repo);
    expect(result.status).toBe("renamed");
    if (result.status === "renamed") {
      expect(result.category.name).toBe("Food & Beverage");
    }
  });
});

describe("archiveCategory", () => {
  it("returns not_found for an unknown category", async () => {
    const repo = new FakeCategoryAdminRepository([GROUP]);
    const result = await archiveCategory("missing", repo);
    expect(result).toEqual({ status: "not_found" });
  });

  it("refuses to archive a category still assigned to venues", async () => {
    const repo = new FakeCategoryAdminRepository([LEAF]);
    repo.venueCounts.set("leaf-cafe", 3);
    const result = await archiveCategory("leaf-cafe", repo);
    expect(result).toEqual({ status: "in_use", venueCount: 3 });
  });

  it("refuses to archive a group that still has active leaf children", async () => {
    const repo = new FakeCategoryAdminRepository([GROUP, LEAF]);
    const result = await archiveCategory("group-food", repo);
    expect(result).toEqual({ status: "has_children", childCount: 1 });
  });

  it("archives a category with no venues or active children", async () => {
    const repo = new FakeCategoryAdminRepository([LEAF]);
    const result = await archiveCategory("leaf-cafe", repo);
    expect(result.status).toBe("archived");
    if (result.status === "archived") {
      expect(result.category.status).toBe("archived");
    }
  });
});
