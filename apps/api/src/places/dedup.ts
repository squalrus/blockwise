import { haversineMeters, type LatLng } from "./geo";

// Same business appearing under slightly different names (README §1.4 step
// 2), e.g. "Diesel Fuel Coffee" vs "Diesel Fuel Coffee Shop" -- catch those
// via name similarity, not exact string match.
const DEDUP_RADIUS_METERS = 30;
const NAME_SIMILARITY_THRESHOLD = 0.6;

export interface DedupCandidate {
  name: string;
  location: LatLng;
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function levenshteinDistance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const distances: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));

  for (let i = 0; i < rows; i++) distances[i][0] = i;
  for (let j = 0; j < cols; j++) distances[0][j] = j;

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      distances[i][j] = Math.min(
        distances[i - 1][j] + 1,
        distances[i][j - 1] + 1,
        distances[i - 1][j - 1] + cost
      );
    }
  }

  return distances[rows - 1][cols - 1];
}

// 1.0 = identical (after normalization), 0.0 = completely different.
export function nameSimilarity(a: string, b: string): number {
  const normA = normalizeName(a);
  const normB = normalizeName(b);
  const maxLength = Math.max(normA.length, normB.length);

  if (maxLength === 0) return 1;

  return 1 - levenshteinDistance(normA, normB) / maxLength;
}

// A name that's merely a prefix/truncation of the other (not just similar)
// is enough on its own within the same DEDUP_RADIUS_METERS as the general
// similarity check -- an OSM name simplification can drop a trailing word
// (live-verified: "Kipos Greek" -> "Kipos" scores nameSimilarity ~0.45, well
// under NAME_SIMILARITY_THRESHOLD) without the underlying place moving more
// than a few meters, if at all, but real-world coordinate noise (the tagged
// node/way centroid shifting slightly along with the rename) means an
// artificially tighter radius than the one already used for a mere
// "similar" name would just miss real renames for no real safety gain: the
// prefix relationship itself is the actual discriminator against two
// unrelated businesses merely sharing an address (a strip mall, a
// multi-tenant building) -- those essentially never share a name prefix,
// regardless of how close together they are.
function isPrefixOfOther(a: string, b: string): boolean {
  return a.length > 0 && b.length > 0 && (a.startsWith(b) || b.startsWith(a));
}

export function isDuplicate(a: DedupCandidate, b: DedupCandidate): boolean {
  const distanceMeters = haversineMeters(a.location, b.location);
  if (distanceMeters >= DEDUP_RADIUS_METERS) return false;
  if (nameSimilarity(a.name, b.name) >= NAME_SIMILARITY_THRESHOLD) return true;
  return isPrefixOfOther(normalizeName(a.name), normalizeName(b.name));
}

export function findDuplicate<T extends DedupCandidate>(
  candidate: DedupCandidate,
  existing: T[]
): T | undefined {
  return existing.find((entry) => isDuplicate(candidate, entry));
}
