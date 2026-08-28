// Category normalization (docs/geoapify-migration-plan.md Phase 2): map a
// place's Geoapify/OSM category tags into the unified taxonomy via each
// Category's source_mapping_json.geoapify list, rather than guessing.
// Unmapped tags are left uncategorized (category_id stays null) for manual
// review in the admin tool, instead of forcing a best-effort guess.
//
// Geoapify's tags are dot-hierarchical (e.g. "catering.restaurant.italian"),
// unlike Google's flat type strings, so matching is prefix-based: a place
// tagged with a specific subtype matches a category configured with a
// broader ancestor tag. Configured tags are checked longest-first so a more
// specific one (e.g. "commercial.food_and_drink.bakery") wins over a
// broader sibling (e.g. "commercial.food_and_drink") when a place could
// match either.

export interface CategoryRecord {
  id: string;
  name: string;
  source_mapping_json: Record<string, unknown>;
}

export interface CategorizablePlace {
  categories: string[];
}

interface GeoapifyCategoryEntry {
  tag: string;
  category: CategoryRecord;
}

export function buildGeoapifyCategoryIndex(categories: CategoryRecord[]): GeoapifyCategoryEntry[] {
  const entries: GeoapifyCategoryEntry[] = [];

  for (const category of categories) {
    const geoapifyTags = category.source_mapping_json.geoapify;
    if (!Array.isArray(geoapifyTags)) continue;

    for (const tag of geoapifyTags) {
      if (typeof tag === "string") entries.push({ tag, category });
    }
  }

  return entries.sort((a, b) => b.tag.length - a.tag.length);
}

function tagMatches(placeTag: string, configuredTag: string): boolean {
  return placeTag === configuredTag || placeTag.startsWith(`${configuredTag}.`);
}

// Checks each of the place's category tags in order (Geoapify returns them
// with no declared "primary" one -- see geoapifyClient.ts's GeoapifyPlace
// comment), against the longest-first index, so the most specific
// configured match wins regardless of which tag or category is scanned
// first.
export function matchCategory(
  place: CategorizablePlace,
  index: GeoapifyCategoryEntry[]
): CategoryRecord | undefined {
  for (const placeTag of place.categories) {
    for (const entry of index) {
      if (tagMatches(placeTag, entry.tag)) return entry.category;
    }
  }

  return undefined;
}
