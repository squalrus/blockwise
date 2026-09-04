-- checkin_timing_log backs a new "Check-in timing" chart on the Monitoring >
-- Performance tab, so the phase-by-phase cost of POST /locations/:id/checkins
-- (checkins/checkin.ts's geofence/cooldown decision, then -- only once a
-- check-in is actually created -- awardCheckinRewards, notifyConnectionsOfCheckin,
-- and recordVenueCollection, all awaited in series today per app.ts's
-- Netlify/Lambda-freeze comment) is visible over time instead of only ever
-- being reasoned about by reading the code. One row per check-in attempt,
-- mirroring request_log's "one row per request" shape -- total_ms is always
-- set (the whole handler's wall-clock time, same measurement request_log
-- already takes), while the phase columns are only set as far as the request
-- actually got: a too_far/cooldown/not_found outcome only ever reaches
-- geofence_ms, since the reward/notify/collection phases never run for it.
create table checkin_timing_log (
  id uuid primary key default gen_random_uuid(),
  outcome text not null check (outcome in ('created', 'too_far', 'cooldown', 'not_found')),
  total_ms int not null,
  geofence_ms int,
  rewards_ms int,
  notify_ms int,
  collection_ms int,
  domain text,
  app_version text,
  created_at timestamptz not null default now()
);

create index checkin_timing_log_created_at_idx on checkin_timing_log (created_at desc);

alter table checkin_timing_log enable row level security;
