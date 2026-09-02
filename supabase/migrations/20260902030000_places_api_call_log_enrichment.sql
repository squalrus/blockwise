-- places_api_call_log was missing the same context error_log/request_log
-- already have: which deployment logged it (domain -- prod vs local dev,
-- 20260825020000_monitoring_domain.sql) and which shipped version (app_
-- version, 20260825040000_monitoring_app_version.sql). A Places failure was
-- also missing what was actually requested (e.g. which place ID a failed
-- getPlaceDetails call was for) -- request_context is a short,
-- endpoint-specific description InstrumentedPlacesClient builds per call
-- (see apps/api/src/places/instrumentedClient.ts) so a failure like
-- "Invalid Place ID" is traceable back to which place ID without a second
-- lookup. Nullable, no backfill -- existing rows predate all three columns,
-- same treatment as the domain/app_version rollout on error_log/request_log.
alter table places_api_call_log add column domain text;
alter table places_api_call_log add column app_version text;
alter table places_api_call_log add column request_context text;

create index places_api_call_log_domain_idx on places_api_call_log (domain);
create index places_api_call_log_app_version_idx on places_api_call_log (app_version);
