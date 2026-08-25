-- Monitoring tab version filter (BACKLOG.md Ref 104 follow-up, alongside
-- 20260825020000's domain column): lets a super admin narrow errors/
-- requests down to the last few shipped releases -- e.g. to check whether a
-- spike started with a specific deploy. Single source of truth is
-- apps/api/package.json's "version" (apps/api/src/monitoring/appVersion.ts),
-- which CLAUDE.md's release workflow already bumps in lockstep across all
-- six package.json files on every release, so no separate value to keep in
-- sync. Nullable, no backfill, same reasoning as the domain column.
alter table error_log add column app_version text;
alter table request_log add column app_version text;

create index error_log_app_version_idx on error_log (app_version);
create index request_log_app_version_idx on request_log (app_version);
