-- Every table so far enables RLS with no policies (see initial schema
-- migration), on the assumption that the service-role key bypasses RLS and
-- can freely read/write. That's true for RLS itself, but this project has
-- auto_expose_new_tables off (config.toml), which is now Supabase's default
-- -- meaning service_role was never actually GRANTed table privileges either,
-- and every query from apps/api (which goes through PostgREST) fails with
-- "permission denied" regardless of RLS. Grant explicitly, and default-grant
-- for tables/functions/sequences created after this migration too.
grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

alter default privileges in schema public
  grant select, insert, update, delete on tables to service_role;
alter default privileges in schema public
  grant usage, select on sequences to service_role;
alter default privileges in schema public
  grant execute on functions to service_role;
