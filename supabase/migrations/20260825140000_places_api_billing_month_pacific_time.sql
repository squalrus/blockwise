-- Google Maps Platform's free monthly tier resets at midnight Pacific Time
-- on the 1st, not UTC midnight and not the billing account's own cycle date
-- (confirmed against Google's docs, 2026-08-25). places_api_month_to_date_by_
-- endpoint and the quota guardrail (apps/api/src/places/quotaGuard.ts) had
-- both been using a UTC calendar-month boundary, which drifts from Google's
-- actual reset by 7-8 hours depending on daylight saving -- for that window
-- at the start of each month, the app would show "0 used" while Google was
-- still counting the previous month's usage against the same tier.
--
-- 'America/Los_Angeles' (not a fixed UTC-7/-8 offset) so this stays correct
-- across the PST/PDT transition without needing a twice-yearly code change.
create or replace function google_places_billing_month_start()
returns timestamptz
language sql
stable
as $$
  select date_trunc('month', now() at time zone 'America/Los_Angeles') at time zone 'America/Los_Angeles';
$$;

-- Dedicated RPC for PlacesApiQuotaGuard's per-request check (via
-- SupabaseMonitoringRepository.getMonthToDateCallCount) -- narrower and
-- cheaper than get_monitoring_analytics below, and keeps the Pacific-Time
-- boundary logic in exactly one place (google_places_billing_month_start)
-- rather than duplicated as JS date math that would need its own DST
-- handling.
create or replace function get_places_api_month_to_date_count(p_endpoint text)
returns bigint
language sql
stable
as $$
  select count(*)
  from places_api_call_log
  where endpoint = p_endpoint
    and success
    and created_at >= google_places_billing_month_start();
$$;

create or replace function get_monitoring_analytics(
  p_days int default 7,
  p_domain text default null,
  p_version text default null,
  p_status_class text default null
)
returns json
language sql
stable
as $$
  select json_build_object(
    'days', p_days,
    'errors_over_time', (
      select coalesce(json_agg(row_to_json(t) order by t.date), '[]'::json)
      from (
        select date_trunc('day', created_at)::date as date, count(*) as count
        from error_log
        where created_at >= now() - (p_days || ' days')::interval
          and (p_domain is null or domain = p_domain)
          and (p_version is null or app_version = p_version)
        group by 1
      ) t
    ),
    'errors_by_source', (
      select coalesce(json_agg(row_to_json(t)), '[]'::json)
      from (
        select source, count(*) as count
        from error_log
        where created_at >= now() - (p_days || ' days')::interval
          and (p_domain is null or domain = p_domain)
          and (p_version is null or app_version = p_version)
        group by 1
      ) t
    ),
    'recent_errors', (
      select coalesce(json_agg(row_to_json(t)), '[]'::json)
      from (
        select id, source, message, stack, context, created_at, domain, app_version
        from error_log
        where (p_domain is null or domain = p_domain)
          and (p_version is null or app_version = p_version)
        order by created_at desc
        limit 50
      ) t
    ),
    'recent_requests', (
      select coalesce(json_agg(row_to_json(t)), '[]'::json)
      from (
        select id, method, path, status_code, duration_ms, created_at, domain, app_version
        from request_log
        where (p_domain is null or domain = p_domain)
          and (p_version is null or app_version = p_version)
          and (p_status_class is null or (status_code / 100 || 'xx') = p_status_class)
        order by created_at desc
        limit 50
      ) t
    ),
    'request_volume_over_time', (
      select coalesce(json_agg(row_to_json(t) order by t.date), '[]'::json)
      from (
        select date_trunc('day', created_at)::date as date, count(*) as count
        from request_log
        where created_at >= now() - (p_days || ' days')::interval
          and (p_domain is null or domain = p_domain)
          and (p_version is null or app_version = p_version)
        group by 1
      ) t
    ),
    'latency_over_time', (
      select coalesce(json_agg(row_to_json(t) order by t.date), '[]'::json)
      from (
        select
          date_trunc('day', created_at)::date as date,
          round(avg(duration_ms)) as avg_ms,
          round(percentile_cont(0.95) within group (order by duration_ms)) as p95_ms
        from request_log
        where created_at >= now() - (p_days || ' days')::interval
          and (p_domain is null or domain = p_domain)
          and (p_version is null or app_version = p_version)
        group by 1
      ) t
    ),
    'status_code_breakdown', (
      select coalesce(json_agg(row_to_json(t)), '[]'::json)
      from (
        select (status_code / 100 || 'xx') as status_class, count(*) as count
        from request_log
        where created_at >= now() - (p_days || ' days')::interval
          and (p_domain is null or domain = p_domain)
          and (p_version is null or app_version = p_version)
        group by 1
      ) t
    ),
    'slowest_routes', (
      select coalesce(json_agg(row_to_json(t)), '[]'::json)
      from (
        select
          path,
          round(avg(duration_ms)) as avg_ms,
          count(*) as request_count
        from request_log
        where created_at >= now() - (p_days || ' days')::interval
          and (p_domain is null or domain = p_domain)
          and (p_version is null or app_version = p_version)
        group by 1
        having count(*) >= 3
        order by avg_ms desc
        limit 10
      ) t
    ),
    'places_api_calls_over_time', (
      select coalesce(json_agg(row_to_json(t) order by t.date), '[]'::json)
      from (
        select date_trunc('day', created_at)::date as date, count(*) as count
        from places_api_call_log
        where created_at >= now() - (p_days || ' days')::interval
        group by 1
      ) t
    ),
    'places_api_by_endpoint', (
      select coalesce(json_agg(row_to_json(t)), '[]'::json)
      from (
        select
          endpoint,
          count(*) as count,
          count(*) filter (where not success) as error_count
        from places_api_call_log
        where created_at >= now() - (p_days || ' days')::interval
        group by 1
      ) t
    ),
    'recent_places_api_failures', (
      select coalesce(json_agg(row_to_json(t)), '[]'::json)
      from (
        select id, endpoint, error_message, duration_ms, created_at
        from places_api_call_log
        where created_at >= now() - (p_days || ' days')::interval
          and not success
        order by created_at desc
        limit 20
      ) t
    ),
    'places_api_calls_by_day_and_endpoint', (
      select coalesce(json_agg(row_to_json(t) order by t.date, t.endpoint), '[]'::json)
      from (
        select date_trunc('day', created_at)::date as date, endpoint, count(*) as count
        from places_api_call_log
        where created_at >= now() - (p_days || ' days')::interval
        group by 1, 2
      ) t
    ),
    'places_api_month_to_date_by_endpoint', (
      select coalesce(json_agg(row_to_json(t)), '[]'::json)
      from (
        select endpoint, count(*) as count
        from places_api_call_log
        where created_at >= google_places_billing_month_start()
          and success
        group by 1
      ) t
    ),
    'available_domains', (
      select coalesce(json_agg(domain order by domain), '[]'::json)
      from (
        select distinct domain from error_log where domain is not null
        union
        select distinct domain from request_log where domain is not null
      ) t
    ),
    'available_versions', (
      select coalesce(json_agg(app_version), '[]'::json)
      from (
        select app_version
        from (
          select app_version from error_log where app_version is not null
          union
          select app_version from request_log where app_version is not null
        ) v
        order by string_to_array(app_version, '.')::int[] desc
        limit 8
      ) t
    )
  );
$$;
