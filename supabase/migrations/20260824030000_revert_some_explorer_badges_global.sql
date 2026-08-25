-- User request: revert all 7 Explorer badge families back to app-wide,
-- undoing the same-day 20260824020000_neighborhood_explorer_badges.sql
-- re-homing entirely (that migration's re-homing was superseded by this
-- one, badge-by-badge, over the course of the same conversation -- ending
-- with every family reverted).

-- Any II (5) / III (10) tier dropped entirely by 20260824020000
-- (Phinneywood had too few active venues in that category to reach those
-- thresholds, and nobody had earned them yet) is recreated here
-- unconditionally as a global row, mirroring the original seed shape
-- (20260710050000_badge_rule_engine.sql). A global badge has no
-- neighborhood venue-count ceiling to worry about, so all three tiers
-- always apply.
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

update badge
set neighborhood_id = null
where code in (
  select f.code_prefix || '_' || t.tier_count
  from (values
    ('coffee_explorer'), ('restaurant_explorer'), ('bar_explorer'), ('bakery_explorer'),
    ('dessert_explorer'), ('brewery_explorer'), ('winery_explorer')
  ) as f(code_prefix)
  cross join (values (1), (5), (10)) as t(tier_count)
);
