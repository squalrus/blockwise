-- A third challenge target alongside category and specific-venue (BACKLOG.md
-- Ref 6): "any POI in the neighborhood", for challenges like "visit a POI" or
-- "visit every POI" that shouldn't be pinned to one venue_id or one category.
-- target_kind mirrors venue.kind's check constraint (only 'poi' is
-- meaningful today -- a "check into any business" challenge isn't a
-- requested use case, but the column admits it later without another
-- migration).

alter table challenge add column target_kind text
  constraint challenge_target_kind_check check (target_kind in ('poi'));

alter table challenge drop constraint challenge_target_check;
alter table challenge add constraint challenge_target_check check (
  (category_id is not null and venue_id is null and target_kind is null) or
  (category_id is null and venue_id is not null and target_kind is null) or
  (category_id is null and venue_id is null and target_kind is not null)
);

-- Convert "Explore Woodland Park" into "Visit any POI": same badge (its
-- description, "Checked in to a Phinneywood point of interest", already read
-- generically), now satisfied by checking into any POI-kind location rather
-- than only Woodland Park.
update challenge
set title = 'Visit any POI',
    description = 'Check in to any point of interest in Phinneywood.',
    venue_id = null,
    target_kind = 'poi',
    target_count = 1
where title = 'Explore Woodland Park';

insert into badge (code, name, description, icon)
select 'poi_completionist', 'POI Completionist', 'Checked in to every point of interest in Phinneywood.', 'map'
where not exists (select 1 from badge where code = 'poi_completionist');

-- target_count is computed from the neighborhood's current active POI count
-- at migration time -- a snapshot, not a live-tracked total, matching this
-- table's template-driven-data-not-code design elsewhere (mirrors
-- 20260707050000_seed_challenges.sql's approach).
insert into challenge (
  neighborhood_id, title, description, target_kind, target_count, points_reward, badge_id, starts_at, ends_at
)
select
  n.id,
  'Visit every POI',
  'Check in to every point of interest in Phinneywood.',
  'poi',
  greatest((
    select count(*) from venue v
    where v.neighborhood_id = n.id and v.kind = 'poi' and v.status = 'active'
  ), 1),
  100,
  b.id,
  '2026-07-01 00:00:00-07',
  '2027-01-01 00:00:00-08'
from neighborhood n, badge b
where n.slug = 'phinneywood-seattle'
  and b.code = 'poi_completionist'
  and not exists (
    select 1 from challenge where neighborhood_id = n.id and title = 'Visit every POI'
  );
