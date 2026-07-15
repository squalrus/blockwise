-- Badge rule engine: badges earned by their own standalone rules, decoupled
-- from challenges entirely (no FK to challenge, no shared evaluation code --
-- see apps/api/src/gamification/badges.ts vs challenges.ts). A badge can
-- still be challenge-only (via challenge.badge_id, unchanged), rule-driven
-- (via badge_rule below), or neither (manually awarded like the founder
-- badge via awardBadgeByCode) -- the three paths never intersect.
--
-- Unlike challenges, badge rules are global (not neighborhood-scoped) and
-- have no time window -- they're permanent profile-level achievements,
-- matching how GET /me/badges already aggregates across every neighborhood.
create table badge_rule (
  id uuid primary key default gen_random_uuid(),
  badge_id uuid not null unique references badge (id) on delete cascade,
  rule_type text not null check (rule_type in (
    'category_milestone',      -- N distinct businesses checked into in category_id
    'poi_milestone',           -- N distinct POIs checked into (any, not split by type)
    'daily_distinct_venues',   -- N distinct locations checked into on one calendar day
    'same_venue_repeat_in_day',-- 2+ check-ins to the same location on one calendar day
    'level_reached'            -- user's level (from all-time points) reaches N
  )),
  category_id uuid references category (id),
  threshold integer not null,
  constraint badge_rule_category_check check (
    (rule_type = 'category_milestone' and category_id is not null) or
    (rule_type <> 'category_milestone' and category_id is null)
  )
);

create index badge_rule_rule_type_idx on badge_rule (rule_type);

alter table badge_rule enable row level security;

-- Category milestone badges: curated to the "collector" Food & Drink
-- categories rather than all ~46 leaf categories -- a neighborhood corridor
-- realistically has a handful of businesses per category, not dozens, so
-- tiers stop at 10 rather than climbing to 50 like the daily badges below.
-- Two separate plain inserts (not chained via a data-modifying CTE) so each
-- is independently idempotent and unambiguous to re-run.
insert into badge (code, name, description, icon)
select
  f.code_prefix || '_' || t.tier_count,
  f.category_name || ' Explorer ' || t.tier_label,
  'Checked in to ' || t.tier_count || ' different ' || f.category_name || ' location' ||
    (case when t.tier_count = 1 then '' else 's' end) || '.',
  f.icon
from (values
  ('Coffee Shop', 'coffee_explorer', 'coffee'),
  ('Restaurant', 'restaurant_explorer', 'utensils'),
  ('Bar', 'bar_explorer', 'beer'),
  ('Bakery', 'bakery_explorer', 'bread'),
  ('Ice Cream & Dessert', 'dessert_explorer', 'ice-cream'),
  ('Brewery', 'brewery_explorer', 'beer'),
  ('Winery', 'winery_explorer', 'wine')
) as f(category_name, code_prefix, icon)
cross join (values (1, 'I'), (5, 'II'), (10, 'III')) as t(tier_count, tier_label)
where not exists (select 1 from badge where code = f.code_prefix || '_' || t.tier_count);

insert into badge_rule (badge_id, rule_type, category_id, threshold)
select b.id, 'category_milestone', c.id, t.tier_count
from (values
  ('Coffee Shop', 'coffee_explorer'),
  ('Restaurant', 'restaurant_explorer'),
  ('Bar', 'bar_explorer'),
  ('Bakery', 'bakery_explorer'),
  ('Ice Cream & Dessert', 'dessert_explorer'),
  ('Brewery', 'brewery_explorer'),
  ('Winery', 'winery_explorer')
) as f(category_name, code_prefix)
cross join (values (1), (5), (10)) as t(tier_count)
join category c on c.name = f.category_name
join badge b on b.code = f.code_prefix || '_' || t.tier_count
where not exists (select 1 from badge_rule where badge_id = b.id);

-- POI milestone badges: aggregate distinct-POI count, not split by POI's
-- free-text `type` field (there's no fixed catalog of POI types to
-- cross-join against, the way category is for businesses).
insert into badge (code, name, description, icon)
select 'landmark_hunter_' || t.tier_count, 'Landmark Hunter ' || t.tier_label,
  'Checked in to ' || t.tier_count || ' different points of interest.', 'compass'
from (values (1, 'I'), (5, 'II'), (10, 'III')) as t(tier_count, tier_label)
where not exists (select 1 from badge where code = 'landmark_hunter_' || t.tier_count);

insert into badge_rule (badge_id, rule_type, threshold)
select b.id, 'poi_milestone', t.tier_count
from (values (1), (5), (10)) as t(tier_count)
join badge b on b.code = 'landmark_hunter_' || t.tier_count
where not exists (select 1 from badge_rule where badge_id = b.id);

-- Daily distinct-venue badges: 5 through 50 in steps of 5.
insert into badge (code, name, description, icon)
select 'day_tripper_' || t.tier_count, t.tier_count || '-Spot Day',
  'Checked in to ' || t.tier_count || ' different places in a single day.', 'zap'
from (values (5), (10), (15), (20), (25), (30), (35), (40), (45), (50)) as t(tier_count)
where not exists (select 1 from badge where code = 'day_tripper_' || t.tier_count);

insert into badge_rule (badge_id, rule_type, threshold)
select b.id, 'daily_distinct_venues', t.tier_count
from (values (5), (10), (15), (20), (25), (30), (35), (40), (45), (50)) as t(tier_count)
join badge b on b.code = 'day_tripper_' || t.tier_count
where not exists (select 1 from badge_rule where badge_id = b.id);

-- Same-venue-repeat-in-day: a single badge, not tiered.
insert into badge (code, name, description, icon)
select 'back_for_seconds', 'Back for Seconds', 'Checked in to the same place twice in one day.', 'repeat'
where not exists (select 1 from badge where code = 'back_for_seconds');

insert into badge_rule (badge_id, rule_type, threshold)
select b.id, 'same_venue_repeat_in_day', 2
from badge b
where b.code = 'back_for_seconds'
  and not exists (select 1 from badge_rule where badge_id = b.id);

-- Level-reached badges: seeded for levels 1-10 to start (POINTS_PER_LEVEL=50
-- in apps/api/src/gamification/points.ts) -- more levels are just more rows,
-- added later as the community's point totals actually approach the ceiling.
insert into badge (code, name, description, icon)
select 'level_' || t.tier_count, 'Level ' || t.tier_count || ' Forager',
  'Reached Level ' || t.tier_count || '.', 'mushroom'
from (values (1), (2), (3), (4), (5), (6), (7), (8), (9), (10)) as t(tier_count)
where not exists (select 1 from badge where code = 'level_' || t.tier_count);

insert into badge_rule (badge_id, rule_type, threshold)
select b.id, 'level_reached', t.tier_count
from (values (1), (2), (3), (4), (5), (6), (7), (8), (9), (10)) as t(tier_count)
join badge b on b.code = 'level_' || t.tier_count
where not exists (select 1 from badge_rule where badge_id = b.id);
