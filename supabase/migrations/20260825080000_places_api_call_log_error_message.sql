-- Places API failures currently only record success = false, with no detail
-- about what went wrong -- the underlying error is only findable indirectly,
-- through whichever caller's console.error happened to catch the re-thrown
-- exception (InstrumentedPlacesClient.timed() logs then rethrows). Adds
-- error_message so a failed call's actual error can be shown directly on
-- the Google Places page, next to the endpoint it failed on.
alter table places_api_call_log add column error_message text;
