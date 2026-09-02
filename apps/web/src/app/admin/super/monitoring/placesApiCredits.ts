import { PLACES_API_CREDIT_COST, type PlacesApiEndpoint } from "@blockwise/types";

// Shared by every credit display on the Geoapify page (endpoint tiles, the
// credits-over-time chart, the free-tier widget) so the total is computed
// the same way everywhere -- see PLACES_API_CREDIT_COST's own comment for
// why this flattens every endpoint to a fixed credits-per-request weight
// rather than tracking Geoapify's "+1 credit per extra 20 results" bonus.
export function estimateCredits(count: number, endpoint: PlacesApiEndpoint): number {
  return count * PLACES_API_CREDIT_COST[endpoint].creditsPerRequest;
}

export function formatCredits(credits: number): string {
  return `${credits.toLocaleString()} credit${credits === 1 ? "" : "s"}`;
}
