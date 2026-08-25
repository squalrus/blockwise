-- Adds app_version filtering to get_monitoring_analytics (v3
-- 20260825030000 added p_domain; this adds its sibling p_version, alongside
-- 20260825040000's app_version column) -- p_version null (default) keeps
-- every version; a specific value (e.g. '0.81.0') narrows every error/
-- request sub-query to rows logged by that release.
--
-- available_versions lists the last 8 distinct versions seen (across all
-- domains/date ranges, same "always growing, never filtered" reasoning as
-- available_domains), ordered newest-first. Ordered by casting the
-- dot-separated parts to int[] rather than a plain text sort, since a plain
-- sort would put '0.9.0' after '0.10.0' -- Postgres compares int[] values
-- element-by-element, which sorts semver-style X.Y.Z correctly as long as
-- every part is numeric (true for every version this project has ever
-- shipped, per CLAUDE.md's "X.Y.Z across six package.json files" scheme).
create or replace function get_monitoring_analytics(p_days int default 7, p_domain text default null, p_version text default null)
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
