-- Seeds the two initial neighborhood-level challenges (BACKLOG.md Ref 6) for
-- Phinneywood. Defensive (select ... where not exists ...) rather than a
-- plain insert, mirroring 20260706032100_phinneywood_boundary.sql, since the
-- Phinneywood row itself is inserted outside of migrations (seed.sql locally,
-- manually on hosted projects) and may not exist yet in every environment.

insert into badge (code, name, description, icon)
select 'coffee_crawler', 'Coffee Crawler', 'Checked in to 5 different coffee shops in Phinneywood during July.', 'coffee'
where not exists (select 1 from badge where code = 'coffee_crawler');

insert into badge (code, name, description, icon)
select 'neighborhood_explorer', 'Neighborhood Explorer', 'Checked in to a Phinneywood point of interest.', 'compass'
where not exists (select 1 from badge where code = 'neighborhood_explorer');

insert into poi (neighborhood_id, name, description, type, lat, lng)
select n.id, 'Woodland Park', 'Neighborhood park and green space.', 'park', n.center_lat, n.center_lng
from neighborhood n
where n.slug = 'phinneywood-seattle'
  and not exists (
    select 1 from poi where neighborhood_id = n.id and name = 'Woodland Park'
  );

insert into challenge (
  neighborhood_id, title, description, category_id, target_count, points_reward, badge_id, starts_at, ends_at
)
select
  n.id,
  'Coffee Crawl',
  'Check in to 5 different coffee shops in Phinneywood during July.',
  c.id,
  5,
  50,
  b.id,
  '2026-07-01 00:00:00-07',
  '2026-08-01 00:00:00-07'
from neighborhood n, category c, badge b
where n.slug = 'phinneywood-seattle'
  and c.name = 'Coffee Shop'
  and b.code = 'coffee_crawler'
  and not exists (
    select 1 from challenge where neighborhood_id = n.id and title = 'Coffee Crawl'
  );

insert into challenge (
  neighborhood_id, title, description, poi_id, target_count, points_reward, badge_id, starts_at, ends_at
)
select
  n.id,
  'Explore Woodland Park',
  'Check in to Woodland Park.',
  p.id,
  1,
  20,
  b.id,
  '2026-07-01 00:00:00-07',
  '2027-01-01 00:00:00-08'
from neighborhood n, poi p, badge b
where n.slug = 'phinneywood-seattle'
  and p.name = 'Woodland Park'
  and p.neighborhood_id = n.id
  and b.code = 'neighborhood_explorer'
  and not exists (
    select 1 from challenge where neighborhood_id = n.id and title = 'Explore Woodland Park'
  );
