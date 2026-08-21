-- Monitoring and error tracking (BACKLOG.md Ref 104): rolled ourselves on
-- Postgres rather than a third-party service (Sentry et al.) per user
-- direction, surfaced on a new super-admin "Monitoring" tab.
--
-- error_log captures both API-side errors (every existing console.error call
-- site in apps/api/src/app.ts already follows a `"<label> failed:"` message
-- convention -- console.error itself is wrapped to also insert a row here,
-- rather than touching each of the ~120 call sites) and web-side errors
-- (React error boundaries + a window.onerror/unhandledrejection listener,
-- POSTing to POST /monitoring/client-errors). `source` distinguishes the two.
create table error_log (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('api', 'web')),
  message text not null,
  stack text,
  context jsonb,
  created_at timestamptz not null default now()
);

create index error_log_created_at_idx on error_log (created_at desc);
create index error_log_source_idx on error_log (source);

alter table error_log enable row level security;

-- request_log backs the Monitoring tab's request-volume/latency charts
-- (project-plan.md §10.4's "API-level request volume and cache-hit-rate
-- metrics"). One row per request, written by a single Express middleware in
-- createApp() rather than per-route -- fine at pilot scale; revisit with
-- sampling if row count becomes a concern (mirrors the "not urgent today"
-- framing on Leaderboard aggregation performance, BACKLOG.md Ref 43).
create table request_log (
  id uuid primary key default gen_random_uuid(),
  method text not null,
  path text not null,
  status_code int not null,
  duration_ms int not null,
  created_at timestamptz not null default now()
);

create index request_log_created_at_idx on request_log (created_at desc);

alter table request_log enable row level security;
