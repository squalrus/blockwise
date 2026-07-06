// Category normalization (README §1.4 step 3 / §2): map a place's Google
// `types[]` into the unified taxonomy via each Category's
// source_mapping_json.google list, rather than guessing. Unmapped types are
// left uncategorized (category_id stays null) for manual review in the
// admin tool once it exists, instead of forcing a best-effort guess.

export interface CategoryRecord {
  id: string;
  name: string;
  source_mapping_json: Record<string, unknown>;
}

export interface CategorizablePlace {
  primaryType?: string;
  types: string[];
}

export function buildGoogleTypeIndex(categories: CategoryRecord[]): Map<string, CategoryRecord> {
  const index = new Map<string, CategoryRecord>();

  for (const category of categories) {
    const googleTypes = category.source_mapping_json.google;
    if (!Array.isArray(googleTypes)) continue;

    for (const type of googleTypes) {
      if (typeof type === "string") index.set(type, category);
    }
  }

  return index;
}

// Checks primaryType first (Google's own best guess at the dominant type),
// then falls through the rest of types[] in the order Google returned them.
export function matchCategory(
  place: CategorizablePlace,
  index: Map<string, CategoryRecord>
): CategoryRecord | undefined {
  if (place.primaryType) {
    const match = index.get(place.primaryType);
    if (match) return match;
  }

  for (const type of place.types) {
    const match = index.get(type);
    if (match) return match;
  }

  return undefined;
}
