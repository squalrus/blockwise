-- Favorite venues (BACKLOG.md). A personal "I like this place" bookmark,
-- device-scoped like check-ins (README §14.2) rather than requiring a signed-in
-- account -- attaches to the existing anonymous app_user row and converts for
-- free on signup with no migration step. Unlike checkin (an event log), a
-- favorite is a toggleable state, so it's unique per (user_id, venue_id)
-- rather than append-only.

create table favorite (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_user (id) on delete cascade,
  venue_id uuid not null references venue (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, venue_id)
);

create index favorite_user_id_idx on favorite (user_id);

alter table favorite enable row level security;
