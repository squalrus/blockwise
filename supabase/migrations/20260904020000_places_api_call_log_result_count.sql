-- Fixes an undercount in Geoapify credit tracking: PLACES_API_CREDIT_COST
-- (packages/types) flattened every searchPlaces/searchText/reverseGeocode
-- call to a flat 1 credit, on the assumption "real tiles/searches run well
-- under 20 results each." That assumption doesn't hold -- sync.ts requests
-- `limit: 500` per tile and has dedicated saturation/subdivision logic
-- specifically because dense-area tiles regularly return well over 20
-- places, and Geoapify actually bills 1 credit per request plus 1 credit
-- per additional 20 results beyond the first 20. A saturated tile could be
-- billed ~25 credits by Geoapify while tracked here as 1, which also feeds
-- PlacesApiQuotaGuard's day-to-date total -- meaning the free-tier
-- guardrail could under-trip during a real bulk sync of a dense
-- neighborhood.
--
-- Fix: log the actual result count per call (InstrumentedPlacesClient) and
-- weight credits per-row instead of a flat per-endpoint constant.
alter table places_api_call_log add column result_count integer;

-- Shared by every credits aggregation below (mirrors geoapify_billing_day_start/
-- monitoring_route_scope's "one place" pattern). NULL result_count covers
-- historical rows logged before this column existed -- coalesced to 20 (1
-- credit) to preserve their prior flat-1-credit accounting rather than
-- retroactively inventing a result count that was never recorded.
create or replace function places_api_call_credits(p_result_count int)
returns numeric
language sql
immutable
as $$
  select greatest(1, ceil(coalesce(p_result_count, 20) / 20.0));
$$;

drop function if exists get_places_api_day_to_date_counts();

create or replace function get_places_api_day_to_date_counts()
returns table (endpoint text, count bigint, credits numeric)
language sql
stable
as $$
  select endpoint, count(*) as count, sum(places_api_call_credits(result_count)) as credits
  from places_api_call_log
  where created_at >= geoapify_billing_day_start()
    and success
  group by 1;
$$;
