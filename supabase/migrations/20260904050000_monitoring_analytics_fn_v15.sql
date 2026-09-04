-- v15: adds two more per-day-per-category breakdowns, same shape/reasoning
-- as v14's request_volume_by_day_and_scope --
--   * errors_by_day_and_source: backs "Errors over time"'s App/API/
--     Marketing overlay (plus total), ignoring p_source for the same
--     "don't self-filter the breakdown" reason.
--   * request_volume_by_day_and_status_class: backs a new chart in the
--     Errors page's "Requests" section, 2xx/3xx/4xx/5xx overlaid plus
--     total -- respects p_route_scope (orthogonal dimension, like every
--     other request_log block) but ignores p_status_class itself.
create or replace function get_monitoring_analytics(
  p_minutes int default 10080,
  p_domain text default null,
  p_version text default null,
  p_status_class text default null,
  p_source text default null,
  p_route_scope text default null
)
returns json
language sql
stable
as $$
  select json_build_object(
    'window_minutes', p_minutes,
    'errors_over_time', (
      select coalesce(json_agg(row_to_json(t) order by t.date), '[]'::json)
      from (
        select date_trunc('day', created_at)::date as date, count(*) as count
        from error_log
        where created_at >= now() - (p_minutes || ' minutes')::interval
          and (p_domain is null or domain = p_domain)
          and (p_version is null or app_version = p_version)
          and (p_source is null or source = p_source)
        group by 1
      ) t
    ),
    'errors_by_source', (
      select coalesce(json_agg(row_to_json(t)), '[]'::json)
      from (
        select source, count(*) as count
        from error_log
        where created_at >= now() - (p_minutes || ' minutes')::interval
          and (p_domain is null or domain = p_domain)
          and (p_version is null or app_version = p_version)
        group by 1
      ) t
    ),
    'errors_by_day_and_source', (
      select coalesce(json_agg(row_to_json(t) order by t.date, t.source), '[]'::json)
      from (
        select date_trunc('day', created_at)::date as date, source, count(*) as count
        from error_log
        where created_at >= now() - (p_minutes || ' minutes')::interval
          and (p_domain is null or domain = p_domain)
          and (p_version is null or app_version = p_version)
        group by 1, 2
      ) t
    ),
    'recent_errors', (
      select coalesce(json_agg(row_to_json(t)), '[]'::json)
      from (
        select id, source, message, stack, context, created_at, domain, app_version
        from error_log
        where (p_domain is null or domain = p_domain)
          and (p_version is null or app_version = p_version)
          and (p_source is null or source = p_source)
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
          and (p_route_scope is null or monitoring_route_scope(path) = p_route_scope)
        order by created_at desc
        limit 50
      ) t
    ),
    'request_volume_over_time', (
      select coalesce(json_agg(row_to_json(t) order by t.date), '[]'::json)
      from (
        select date_trunc('day', created_at)::date as date, count(*) as count
        from request_log
        where created_at >= now() - (p_minutes || ' minutes')::interval
          and (p_domain is null or domain = p_domain)
          and (p_version is null or app_version = p_version)
          and (p_route_scope is null or monitoring_route_scope(path) = p_route_scope)
        group by 1
      ) t
    ),
    'request_volume_by_day_and_scope', (
      select coalesce(json_agg(row_to_json(t) order by t.date, t.scope), '[]'::json)
      from (
        select date_trunc('day', created_at)::date as date, monitoring_route_scope(path) as scope, count(*) as count
        from request_log
        where created_at >= now() - (p_minutes || ' minutes')::interval
          and (p_domain is null or domain = p_domain)
          and (p_version is null or app_version = p_version)
        group by 1, 2
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
        where created_at >= now() - (p_minutes || ' minutes')::interval
          and (p_domain is null or domain = p_domain)
          and (p_version is null or app_version = p_version)
          and (p_route_scope is null or monitoring_route_scope(path) = p_route_scope)
        group by 1
      ) t
    ),
    'status_code_breakdown', (
      select coalesce(json_agg(row_to_json(t)), '[]'::json)
      from (
        select (status_code / 100 || 'xx') as status_class, count(*) as count
        from request_log
        where created_at >= now() - (p_minutes || ' minutes')::interval
          and (p_domain is null or domain = p_domain)
          and (p_version is null or app_version = p_version)
          and (p_route_scope is null or monitoring_route_scope(path) = p_route_scope)
        group by 1
      ) t
    ),
    'request_volume_by_day_and_status_class', (
      select coalesce(json_agg(row_to_json(t) order by t.date, t.status_class), '[]'::json)
      from (
        select
          date_trunc('day', created_at)::date as date,
          (status_code / 100 || 'xx') as status_class,
          count(*) as count
        from request_log
        where created_at >= now() - (p_minutes || ' minutes')::interval
          and (p_domain is null or domain = p_domain)
          and (p_version is null or app_version = p_version)
          and (p_route_scope is null or monitoring_route_scope(path) = p_route_scope)
        group by 1, 2
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
        where created_at >= now() - (p_minutes || ' minutes')::interval
          and (p_domain is null or domain = p_domain)
          and (p_version is null or app_version = p_version)
          and (p_route_scope is null or monitoring_route_scope(path) = p_route_scope)
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
        where created_at >= now() - (p_minutes || ' minutes')::interval
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
          count(*) filter (where not success) as error_count,
          coalesce(sum(places_api_call_credits(result_count)) filter (where success), 0) as credits
        from places_api_call_log
        where created_at >= now() - (p_minutes || ' minutes')::interval
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
        where created_at >= now() - (p_minutes || ' minutes')::interval
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
        select
          date_trunc('day', created_at)::date as date,
          endpoint,
          count(*) as count,
          coalesce(sum(places_api_call_credits(result_count)) filter (where success), 0) as credits
        from places_api_call_log
        where created_at >= now() - (p_minutes || ' minutes')::interval
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
