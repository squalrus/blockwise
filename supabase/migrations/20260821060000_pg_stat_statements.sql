-- Monitoring tab addition: real DB-level query latency (BACKLOG.md Ref 104
-- follow-up), pairing with request_log's Express-level latency so a slow
-- route can be traced to "the app" vs. "the query" -- pg_stat_statements is
-- a stock Postgres extension already available on Supabase, no new vendor.
--
-- Supabase pre-installs pg_stat_statements into the `extensions` schema by
-- default on every project (their own dashboard's Query Performance report
-- depends on it), so `with schema extensions` matches that existing install
-- rather than creating a second copy in `public` -- `if not exists` makes
-- this a no-op when it's already there, same as postgis's plain
-- `create extension if not exists postgis;` (20260706024100_initial_schema.sql)
-- for the one extension in this repo that Supabase doesn't pre-install.
create extension if not exists pg_stat_statements with schema extensions;

-- pg_stat_statements requires elevated read privileges the service_role
-- calling this via PostgREST doesn't have by default, so this runs as
-- security definer (the privileges of whichever role ran this migration,
-- typically the Supabase-managed postgres/supabase_admin superuser) rather
-- than invoker rights like every other RPC in this repo. Execute is revoked
-- from public and granted only to service_role, so it can't be reached by
-- anon/authenticated even indirectly. The view is schema-qualified
-- (extensions.pg_stat_statements) rather than relying on search_path to
-- find it, since it lives in `extensions`, not `public`.
create or replace function get_slow_queries(p_limit int default 10)
returns table (
  query text,
  calls bigint,
  mean_exec_time float8,
  total_exec_time float8
)
language sql
security definer
set search_path = public, pg_catalog
stable
as $$
  select
    left(pgss.query, 300) as query,
    pgss.calls,
    round(pgss.mean_exec_time::numeric, 2)::float8 as mean_exec_time,
    round(pgss.total_exec_time::numeric, 2)::float8 as total_exec_time
  from extensions.pg_stat_statements pgss
  where pgss.calls >= 5
    and pgss.query not ilike '%pg_stat_statements%'
  order by pgss.mean_exec_time desc
  limit p_limit;
$$;

revoke all on function get_slow_queries(int) from public;
grant execute on function get_slow_queries(int) to service_role;
