-- Phase 4 of the Geoapify migration (docs/geoapify-migration-plan.md):
-- InstrumentedPlacesClient now wraps the real Geoapify client and logs
-- "searchPlaces" (Geoapify's Places API), not Google's "searchNearby".
-- fetchPhotoMedia is no longer called at all (photo galleries were removed
-- as a product feature in Phase 3) and searchText now fronts Geoapify's
-- Geocoding API for investigate.ts instead of Google's Text Search, same
-- endpoint name, different provider underneath. searchNearby/fetchPhotoMedia
-- stay valid here only so historical rows logged before this cutover still
-- satisfy the constraint -- new rows won't produce them.
alter table places_api_call_log drop constraint places_api_call_log_endpoint_check;
alter table places_api_call_log add constraint places_api_call_log_endpoint_check
  check (endpoint in ('searchNearby', 'searchPlaces', 'searchText', 'getPlaceDetails', 'fetchPhotoMedia'));
