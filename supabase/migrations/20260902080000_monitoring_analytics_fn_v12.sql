-- v12: adds p_route_scope so the Performance sub-tab can filter request_log-
-- derived charts (request volume, latency, status codes, slowest routes,
-- recent requests) down to the public-facing app vs. owner/admin dashboards
-- vs. auth endpoints -- request_log.path already carries this signal (it's
-- the literal Express req.path, e.g. "/admin/monitoring/analytics",
-- "/neighborhood-admin/neighborhoods/:id/locations", "/locations/:id"), no
-- new instrumentation needed.
--
-- monitoring_route_scope centralizes the path -> scope mapping in one place
-- rather than repeating the same like-pattern chain in every one of the five
-- request_log subqueries below (mirrors getAppDomain()'s "one place" framing
-- on the app side). 'admin' covers every owner/admin-gated dashboard
-- (/admin/*, /neighborhood-admin/*, /business/*), not just super-admin --
-- the ask behind this filter is isolating the public-facing app's own
-- performance, and a business owner's dashboard is no more "public-facing"
-- than a neighborhood admin's.
create or replace function monitoring_route_scope(p_path text)
returns text
language sql
immutable
as $$
  select case
    when p_path like '/admin/%' or p_path like '/neighborhood-admin/%' or p_path like '/business/%' then 'admin'
    when p_path like '/auth/%' then 'auth'
    else 'app'
  end;
$$;

drop function if exists get_monitoring_analytics(int, text, text, text, text);

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
          count(*) filter (where not success) as error_count
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
        select date_trunc('day', created_at)::date as date, endpoint, count(*) as count
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
