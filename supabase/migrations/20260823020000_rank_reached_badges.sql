-- "Top Cap" badges: ranked #1 by 60-day check-in count ("Top Caps") at a
-- business, at a POI, or across an entire neighborhood -- three separate
-- rule types (mirroring category_milestone/poi_milestone's existing split)
-- rather than one generic rule plus a kind/scope column. threshold is always
-- 1 (isTopVisitorForVenue/isTopVisitorForNeighborhood in apps/api's
-- gamification/supabaseRepository.ts are boolean, not a count), kept only
-- for schema consistency with every other badge_rule row. Evaluated on every
-- check-in alongside the rest of the rule engine (see
-- evaluateBadgesAfterCheckin in apps/api's gamification/badges.ts).

alter table badge_rule drop constraint badge_rule_rule_type_check;
alter table badge_rule add constraint badge_rule_rule_type_check
  check (rule_type in (
    'category_milestone',
    'poi_milestone',
    'daily_distinct_venues',
    'same_venue_repeat_in_day',
    'level_reached',
    'neighbor_count_reached',
    'collection_milestone',
    'business_rank_reached',      -- #1 ranked visitor at a business
    'poi_rank_reached',           -- #1 ranked visitor at a POI
    'neighborhood_rank_reached'   -- #1 ranked visitor across a whole neighborhood
  ));

insert into badge (code, name, description, icon)
select f.code, f.name, f.description, 'crown'
from (values
  ('business_top_cap', 'Business Top Cap', 'Ranked #1 for check-ins at a business in the last 60 days.'),
  ('poi_top_cap', 'Landmark Top Cap', 'Ranked #1 for check-ins at a point of interest in the last 60 days.'),
  ('neighborhood_top_cap', 'Neighborhood Top Cap', 'Ranked #1 for check-ins across a whole neighborhood in the last 60 days.')
) as f(code, name, description)
where not exists (select 1 from badge where code = f.code);

insert into badge_rule (badge_id, rule_type, threshold)
select b.id, r.rule_type, 1
from (values
  ('business_top_cap', 'business_rank_reached'),
  ('poi_top_cap', 'poi_rank_reached'),
  ('neighborhood_top_cap', 'neighborhood_rank_reached')
) as r(code, rule_type)
join badge b on b.code = r.code
where not exists (select 1 from badge_rule where badge_id = b.id);
