-- Challenges + badges/points (BACKLOG.md Ref 6) -- core gamification loop.
-- Points: check-in = 10, favorite/follow a venue = 5 (first time only, so
-- unfavorite/refavorite cycling can't farm points). Template-driven
-- challenges (a data change, not a code change) reward bonus points and
-- optionally a badge on completion.

-- Append-only ledger of every point-earning action. Scoped to a neighborhood
-- (derived from the venue/POI at write time) so the leaderboard can be
-- computed per neighborhood with a simple group-by. challenge_id's FK is
-- added at the bottom of this file, once the challenge table exists.
create table point_event (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_user (id) on delete cascade,
  neighborhood_id uuid not null references neighborhood (id) on delete cascade,
  event_type text not null check (event_type in ('checkin', 'favorite', 'challenge_completion')),
  points integer not null,
  venue_id uuid references venue (id) on delete cascade,
  poi_id uuid references poi (id) on delete cascade,
  checkin_id uuid references checkin (id) on delete cascade,
  challenge_id uuid,
  created_at timestamptz not null default now()
);

create index point_event_user_id_idx on point_event (user_id);
create index point_event_neighborhood_id_idx on point_event (neighborhood_id);

-- One point event per check-in (the 10pt award is 1:1 with the checkin row
-- that earned it).
create unique index point_event_checkin_id_idx on point_event (checkin_id) where checkin_id is not null;

-- First-time-favoriting-this-venue bonus only -- a favorite row can be
-- deleted and recreated (favorite/repository.ts), but the 5pts should only
-- ever be earned once per (user, venue).
create unique index point_event_favorite_venue_idx on point_event (user_id, venue_id) where event_type = 'favorite';

alter table point_event enable row level security;

create table badge (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  icon text,
  created_at timestamptz not null default now()
);

alter table badge enable row level security;

-- Template-driven: a challenge targets either a category (e.g. "Coffee
-- Shop") within the neighborhood, counting distinct venues checked into, or
-- a single POI. New challenges are rows here, not code.
create table challenge (
  id uuid primary key default gen_random_uuid(),
  neighborhood_id uuid not null references neighborhood (id) on delete cascade,
  title text not null,
  description text,
  category_id uuid references category (id),
  poi_id uuid references poi (id) on delete cascade,
  target_count integer not null default 1,
  points_reward integer not null default 0,
  badge_id uuid references badge (id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint challenge_target_check check (
    (category_id is not null and poi_id is null) or
    (category_id is null and poi_id is not null)
  ),
  constraint challenge_dates_check check (ends_at > starts_at)
);

create index challenge_neighborhood_id_idx on challenge (neighborhood_id);
create index challenge_active_window_idx on challenge (neighborhood_id, starts_at, ends_at);

alter table challenge enable row level security;

create table user_badge (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_user (id) on delete cascade,
  badge_id uuid not null references badge (id) on delete cascade,
  challenge_id uuid references challenge (id) on delete set null,
  awarded_at timestamptz not null default now(),
  unique (user_id, badge_id)
);

create index user_badge_user_id_idx on user_badge (user_id);

alter table user_badge enable row level security;

-- Marks a challenge as done for a user so repeat check-ins after hitting the
-- target don't re-award points/badges.
create table user_challenge_completion (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_user (id) on delete cascade,
  challenge_id uuid not null references challenge (id) on delete cascade,
  completed_at timestamptz not null default now(),
  unique (user_id, challenge_id)
);

create index user_challenge_completion_user_id_idx on user_challenge_completion (user_id);

alter table user_challenge_completion enable row level security;

alter table point_event add constraint point_event_challenge_id_fkey
  foreign key (challenge_id) references challenge (id) on delete cascade;
