-- BACKLOG.md Ref 98 follow-up: badge tier for the forager collection --
-- awarded on total distinct species count (venue + connection combined,
-- mushroom_collection row count), evaluated after either kind of collection
-- event (see evaluateBadgesForCollectionCount in apps/api's badges.ts),
-- mirroring neighbor_count_reached's shape (20260712020000).

alter table badge_rule drop constraint badge_rule_rule_type_check;
alter table badge_rule add constraint badge_rule_rule_type_check
  check (rule_type in (
    'category_milestone',
    'poi_milestone',
    'daily_distinct_venues',
    'same_venue_repeat_in_day',
    'level_reached',
    'neighbor_count_reached',
    'collection_milestone'   -- N total mushroom_collection rows (venue + connection combined)
  ));

-- Forager badges: 10 through 100 in steps of 10.
insert into badge (code, name, description, icon)
select
  'forager_' || t.tier_count,
  t.tier_count || '-Species Forager',
  'Collected ' || t.tier_count || ' mushroom species.',
  'mushroom'
from (values (10), (20), (30), (40), (50), (60), (70), (80), (90), (100)) as t(tier_count)
where not exists (select 1 from badge where code = 'forager_' || t.tier_count);

insert into badge_rule (badge_id, rule_type, threshold)
select b.id, 'collection_milestone', t.tier_count
from (values (10), (20), (30), (40), (50), (60), (70), (80), (90), (100)) as t(tier_count)
join badge b on b.code = 'forager_' || t.tier_count
where not exists (select 1 from badge_rule where badge_id = b.id);
