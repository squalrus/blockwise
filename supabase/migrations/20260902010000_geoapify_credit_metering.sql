-- Phase 7 of the Geoapify migration (docs/geoapify-migration-plan.md,
-- BACKLOG.md Ref 114): full rename/removal of the Google-only endpoint
-- values, and a switch from Google's monthly-$/free-events metering to
-- Geoapify's actual daily-credit metering (3,000 free credits/day, shared
-- across every endpoint -- see docs/location-services-comparison.md).
--
-- searchNearby/fetchPhotoMedia were Google's method names, retired from
-- InstrumentedPlacesClient back in Phase 4 (v0.84.4) and kept in the CHECK
-- constraint only so historical rows logged before that cutover still
-- satisfied it. Those rows predate the Geoapify cutover entirely -- they
-- describe Google API calls, not Geoapify ones -- so they're purged here
-- rather than carried forward under a metering model they were never
-- subject to, and the constraint is tightened to Geoapify's 4 real
-- endpoints now that nothing depends on the old values.
delete from places_api_call_log where endpoint in ('searchNearby', 'fetchPhotoMedia');

alter table places_api_call_log drop constraint places_api_call_log_endpoint_check;
alter table places_api_call_log add constraint places_api_call_log_endpoint_check
  check (endpoint in ('searchPlaces', 'searchText', 'reverseGeocode', 'getPlaceDetails'));

-- Google's free tier reset at midnight Pacific Time on the 1st of each
-- calendar month; Geoapify's resets daily instead, and its docs don't state
-- a reset timezone, so this uses plain UTC midnight (now(), not `at time
-- zone`) as the simplest reasonable assumption rather than porting the
-- Pacific-Time handling forward for a boundary that's no longer Google's.
create or replace function geoapify_billing_day_start()
returns timestamptz
language sql
stable
as $$
  select date_trunc('day', now());
$$;

drop function if exists google_places_billing_month_start();
drop function if exists get_places_api_month_to_date_count(text);

-- Replaces get_places_api_month_to_date_count -- returns every endpoint's
-- count in one call instead of one endpoint at a time, since Geoapify's
-- free tier is one shared daily pool (not a separate tier per endpoint the
-- way Google's was), so PlacesApiQuotaGuard needs every endpoint's count to
-- weight and sum into a single total. Also backs
-- get_monitoring_analytics's places_api_day_to_date_by_endpoint below, so
-- the boundary logic lives in exactly one place.
create or replace function get_places_api_day_to_date_counts()
returns table (endpoint text, count bigint)
language sql
stable
as $$
  select endpoint, count(*) as count
  from places_api_call_log
  where created_at >= geoapify_billing_day_start()
    and success
  group by 1;
$$;
