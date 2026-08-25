-- Monitoring tab domain filter (BACKLOG.md Ref 104 follow-up): lets a super
-- admin filter error_log/request_log by which deployment logged them --
-- app.tryspored.com (prod) vs localhost (local dev) vs a future
-- dev.tryspored.com -- rather than local dev noise (both apps point at the
-- same hosted Supabase project per README) drowning out production issues.
-- Nullable, no backfill: existing rows predate the concept and are treated
-- as "unknown" (excluded when a specific domain is selected, still counted
-- under "All").
alter table error_log add column domain text;
alter table request_log add column domain text;

create index error_log_domain_idx on error_log (domain);
create index request_log_domain_idx on request_log (domain);
