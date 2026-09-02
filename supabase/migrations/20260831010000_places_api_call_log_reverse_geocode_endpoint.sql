-- Geoapify migration Phase 5's coordinate-based match (BACKLOG.md Ref 114):
-- InstrumentedPlacesClient now also logs "reverseGeocode" calls (Geoapify's
-- Geocoding API reverse lookup, v1/geocode/reverse), the geoapify-migration
-- page's per-location suggestion alongside the existing free-text search.
alter table places_api_call_log drop constraint places_api_call_log_endpoint_check;
alter table places_api_call_log add constraint places_api_call_log_endpoint_check
  check (endpoint in ('searchNearby', 'searchPlaces', 'searchText', 'reverseGeocode', 'getPlaceDetails', 'fetchPhotoMedia'));
