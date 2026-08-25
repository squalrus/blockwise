-- Adds domain filtering to get_monitoring_analytics (20260821040000,
-- v2 20260821070000) -- p_domain null (default) keeps today's "all
-- deployments" behavior; a specific value (e.g. 'app.tryspored.com')
-- narrows every error/request sub-query to rows logged by that deployment
-- (see 20260825020000_monitoring_domain.sql, apps/api/src/monitoring/appDomain.ts).
-- places_api_call_log has no domain column (outbound server-to-Google calls,
-- no browser origin to attribute), so that section stays unfiltered.
--
-- available_domains is a new, always-unfiltered-by-p_domain/p_days key so
-- the Monitoring tab's domain picker always lists every domain that has
-- ever logged something (not just ones active in the current date range),
-- and a future new site (e.g. dev.tryspored.com) shows up automatically
-- the first time it logs anything, with no code change needed here.
create or replace function get_monitoring_analytics(p_days int default 7, p_domain text default null)
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
        group by 1
      ) t
    ),
    'recent_errors', (
      select coalesce(json_agg(row_to_json(t)), '[]'::json)
      from (
        select id, source, message, stack, context, created_at, domain
        from error_log
        where (p_domain is null or domain = p_domain)
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
    )
  );
$$;
