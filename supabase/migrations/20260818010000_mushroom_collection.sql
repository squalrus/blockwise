-- Forager collection (BACKLOG.md Ref 98) -- a per-venue or per-neighbor
-- mushroom "species" a user collects by checking in at a venue for the first
-- time, or by accepting a connection with a neighbor for the first time.
-- The species' look/name isn't stored here -- it's derived deterministically
-- from venue_id/connection_user_id (mushroomConfigForSpecies /
-- mushroomSpeciesName in @blockwise/types), so this table only tracks *what*
-- a user has discovered and how many times, not the look itself.
create table mushroom_collection (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_user (id) on delete cascade,
  venue_id uuid references venue (id) on delete cascade,
  connection_user_id uuid references app_user (id) on delete cascade,
  quantity integer not null default 1,
  first_collected_at timestamptz not null default now(),
  constraint mushroom_collection_target_check check (
    (venue_id is not null and connection_user_id is null) or
    (venue_id is null and connection_user_id is not null)
  ),
  unique (user_id, venue_id),
  unique (user_id, connection_user_id)
);

create index mushroom_collection_user_id_idx on mushroom_collection (user_id);

alter table mushroom_collection enable row level security;
