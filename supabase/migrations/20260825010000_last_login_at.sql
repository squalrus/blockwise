-- Super-admin Users tab "last login" column: stamped by completeLogin
-- (apps/api/src/auth/auth.ts) on every real POST /auth/complete-login, not
-- on every /auth/me poll -- defaults to now() so it's already populated at
-- signup (a first signup is also a first login) rather than reading blank
-- until a second visit.
alter table app_user add column last_login_at timestamptz not null default now();
