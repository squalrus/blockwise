-- v9: places_api_call_log now carries domain/app_version (20260902030000),
-- so the places_api_* sections can finally respect the header's domain/
-- version filters the same way error_log/request_log always have --
-- previously every Places section ignored both, always showing every
-- deployment's calls mixed together (see the places/page.tsx and
-- PlacesApiCallsChart.tsx comments this migration makes stale). Also
-- surfaces the new request_context/domain/app_version columns on
-- recent_places_api_failures, so a failed call is traceable back to what it
-- actually requested (e.g. which place ID) and where it ran from.
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
          and (p_domain is null or domain = p_domain)
          and (p_version is null or app_version = p_version)
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
          and (p_domain is null or domain = p_domain)
          and (p_version is null or app_version = p_version)
        group by 1
      ) t
    ),
    'recent_places_api_failures', (
      select coalesce(json_agg(row_to_json(t)), '[]'::json)
      from (
        select id, endpoint, error_message, request_context, duration_ms, created_at, domain, app_version
        from places_api_call_log
        where created_at >= now() - (p_days || ' days')::interval
          and (p_domain is null or domain = p_domain)
          and (p_version is null or app_version = p_version)
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
          and (p_domain is null or domain = p_domain)
          and (p_version is null or app_version = p_version)
        group by 1, 2
      ) t
    ),
    'places_api_day_to_date_by_endpoint', (
      select coalesce(json_agg(row_to_json(t)), '[]'::json)
      from get_places_api_day_to_date_counts() t
    ),
    'available_domains', (
      select coalesce(json_agg(domain order by domain), '[]'::json)
      from (
        select distinct domain from error_log where domain is not null
        union
        select distinct domain from request_log where domain is not null
        union
        select distinct domain from places_api_call_log where domain is not null
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
          union
          select app_version from places_api_call_log where app_version is not null
        ) v
        order by string_to_array(app_version, '.')::int[] desc
        limit 8
      ) t
    )
  );
$$;
