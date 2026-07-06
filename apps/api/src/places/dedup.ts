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

export function isDuplicate(a: DedupCandidate, b: DedupCandidate): boolean {
  return (
    haversineMeters(a.location, b.location) < DEDUP_RADIUS_METERS &&
    nameSimilarity(a.name, b.name) >= NAME_SIMILARITY_THRESHOLD
  );
}

export function findDuplicate<T extends DedupCandidate>(
  candidate: DedupCandidate,
  existing: T[]
): T | undefined {
  return existing.find((entry) => isDuplicate(candidate, entry));
}
