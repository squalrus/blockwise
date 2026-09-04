import type { PlacesApiEndpoint } from "@blockwise/types";

// Shared by every Geoapify-page component that breaks a stat down per
// endpoint (PlacesApiFreeTierStats, PlacesApiByEndpointStats, and the two
// charts below) -- one definition so a label or color can't drift out of
// sync between them. 4 endpoints, 4 brand colors, one each -- no slot-sharing
// needed now that the Google-only searchNearby/fetchPhotoMedia values are
// gone (Geoapify migration Phase 7).
export const PLACES_API_ENDPOINT_ORDER: PlacesApiEndpoint[] = [
  "searchPlaces",
  "searchText",
  "reverseGeocode",
  "getPlaceDetails",
];

export const PLACES_API_ENDPOINT_LABELS: Record<PlacesApiEndpoint, string> = {
  searchPlaces: "Places search",
  searchText: "Text search",
  reverseGeocode: "Reverse geocode",
  getPlaceDetails: "Place details",
};

export const PLACES_API_ENDPOINT_COLORS: Record<PlacesApiEndpoint, string> = {
  searchPlaces: "var(--brand-purple)",
  searchText: "var(--brand-amber)",
  reverseGeocode: "var(--brand-orange)",
  getPlaceDetails: "var(--brand-green)",
};
