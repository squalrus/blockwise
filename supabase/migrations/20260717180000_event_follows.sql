-- Follow events (BACKLOG.md Ref 81): signed-in-only bookmark on an event,
-- mirroring favorite_venues' shape (20260706060000_favorite_venues.sql).
create table event_follow (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_user (id) on delete cascade,
  event_id uuid not null references event (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, event_id)
);

create index event_follow_user_id_idx on event_follow (user_id);

alter table event_follow enable row level security;
