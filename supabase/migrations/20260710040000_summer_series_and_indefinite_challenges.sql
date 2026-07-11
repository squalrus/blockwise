-- 1. Indefinite challenges (no end date) -- e.g. a standing "thanks for
-- visiting" that should never expire, rather than needing a far-future
-- placeholder ends_at like the old 2027-01-01 hack.
alter table challenge alter column ends_at drop not null;
alter table challenge drop constraint challenge_dates_check;
alter table challenge add constraint challenge_dates_check check (ends_at is null or ends_at > starts_at);

-- 2. A fourth target alongside category/venue/target_kind='poi': 'any',
-- satisfied by a check-in anywhere in the neighborhood regardless of
-- category or location kind (e.g. "thanks for visiting" below).
alter table challenge drop constraint challenge_target_kind_check;
alter table challenge add constraint challenge_target_kind_check check (target_kind in ('poi', 'any'));

-- 3. Summer Series: give the three existing challenges (Coffee Crawl, Visit
-- any POI, Visit every POI) a shared, actually-summer window instead of
-- Coffee Crawl's July-only run and the other two's 2027-01-01 placeholder.
update challenge
set starts_at = '2026-07-01 00:00:00-07', ends_at = '2026-09-22 00:00:00-07'
where title in ('Coffee Crawl', 'Visit any POI', 'Visit every POI');

insert into badge (code, name, description, icon)
values
  ('bar_hopper', 'Bar Hopper', 'Checked in to 3 different bars in Phinneywood during the Summer Series.', 'beer'),
  ('bakery_tourist', 'Bakery Tourist', 'Checked in to 3 different bakeries in Phinneywood during the Summer Series.', 'bread'),
  ('retail_therapist', 'Retail Therapist', 'Checked in to 5 different gift & specialty shops in Phinneywood during the Summer Series.', 'shopping-bag'),
  ('phinneywood_foodie', 'Phinneywood Foodie', 'Checked in to 3 different restaurants in Phinneywood during the Summer Series.', 'utensils'),
  ('phinneywood_welcome', 'Welcome Neighbor', 'Checked in anywhere in Phinneywood for the first time.', 'heart')
on conflict (code) do nothing;

-- Summer Series category challenges (BACKLOG.md Ref 6 template pattern,
-- mirroring Coffee Crawl). "Retail Therapy" targets the single leaf category
-- "Gift & Specialty Shop" rather than the whole Retail group -- challenge
-- only supports one category_id per row today, not a group-wide match
-- across every Retail leaf category.
insert into challenge (
  neighborhood_id, title, description, category_id, target_count, points_reward, badge_id, starts_at, ends_at
)
select n.id, 'Bar Hop', 'Check in to 3 different bars in Phinneywood.', c.id, 3, 30, b.id,
  '2026-07-01 00:00:00-07', '2026-09-22 00:00:00-07'
from neighborhood n, category c, badge b
where n.slug = 'phinneywood-seattle' and c.name = 'Bar' and b.code = 'bar_hopper'
  and not exists (select 1 from challenge where neighborhood_id = n.id and title = 'Bar Hop');

insert into challenge (
  neighborhood_id, title, description, category_id, target_count, points_reward, badge_id, starts_at, ends_at
)
select n.id, 'Bakery Tour', 'Check in to 3 different bakeries in Phinneywood.', c.id, 3, 30, b.id,
  '2026-07-01 00:00:00-07', '2026-09-22 00:00:00-07'
from neighborhood n, category c, badge b
where n.slug = 'phinneywood-seattle' and c.name = 'Bakery' and b.code = 'bakery_tourist'
  and not exists (select 1 from challenge where neighborhood_id = n.id and title = 'Bakery Tour');

insert into challenge (
  neighborhood_id, title, description, category_id, target_count, points_reward, badge_id, starts_at, ends_at
)
select n.id, 'Taste of Phinneywood', 'Check in to 3 different restaurants in Phinneywood.', c.id, 3, 30, b.id,
  '2026-07-01 00:00:00-07', '2026-09-22 00:00:00-07'
from neighborhood n, category c, badge b
where n.slug = 'phinneywood-seattle' and c.name = 'Restaurant' and b.code = 'phinneywood_foodie'
  and not exists (select 1 from challenge where neighborhood_id = n.id and title = 'Taste of Phinneywood');

insert into challenge (
  neighborhood_id, title, description, category_id, target_count, points_reward, badge_id, starts_at, ends_at
)
select n.id, 'Retail Therapy', 'Check in to 5 different gift & specialty shops in Phinneywood.', c.id, 5, 50, b.id,
  '2026-07-01 00:00:00-07', '2026-09-22 00:00:00-07'
from neighborhood n, category c, badge b
where n.slug = 'phinneywood-seattle' and c.name = 'Gift & Specialty Shop' and b.code = 'retail_therapist'
  and not exists (select 1 from challenge where neighborhood_id = n.id and title = 'Retail Therapy');

-- Evergreen (no ends_at): the only target_kind='any' challenge -- completed
-- by a single check-in anywhere in the neighborhood, regardless of category
-- or location kind. Not part of the Summer Series window since it's meant to
-- keep welcoming new visitors indefinitely.
insert into challenge (
  neighborhood_id, title, description, target_kind, target_count, points_reward, badge_id, starts_at, ends_at
)
select n.id, 'Thanks for Visiting Phinneywood', 'Check in anywhere in Phinneywood to say hello.', 'any', 1, 10, b.id,
  '2026-07-01 00:00:00-07', null
from neighborhood n, badge b
where n.slug = 'phinneywood-seattle' and b.code = 'phinneywood_welcome'
  and not exists (select 1 from challenge where neighborhood_id = n.id and title = 'Thanks for Visiting Phinneywood');
