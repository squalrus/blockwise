import { PLACES_API_PRICING, type PlacesApiEndpoint } from "@blockwise/types";

// Shared by every cost display on the Google Places page (endpoint tiles,
// the cost-over-time chart, the free-tier widget) so the estimate is
// computed the same way everywhere -- see PLACES_API_PRICING's own comment
// for why this is an upper-bound estimate, not GCP's actual bill.
export function estimateCost(count: number, endpoint: PlacesApiEndpoint): number {
  return (count / 1000) * PLACES_API_PRICING[endpoint].ratePerThousand;
}

export function formatUsd(amount: number): string {
  if (amount <= 0) return "$0.00";
  if (amount < 0.01) return "<$0.01";
  return `$${amount.toFixed(2)}`;
}
