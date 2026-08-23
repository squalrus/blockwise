-- Extends the level-reached badge tiers seeded in 20260710050000 (levels
-- 1-10) up through level 20 -- same idempotent insert shape, just picking up
-- where that one left off as community point totals climb higher.
insert into badge (code, name, description, icon)
select 'level_' || t.tier_count, 'Level ' || t.tier_count || ' Forager',
  'Reached Level ' || t.tier_count || '.', 'mushroom'
from (values (11), (12), (13), (14), (15), (16), (17), (18), (19), (20)) as t(tier_count)
where not exists (select 1 from badge where code = 'level_' || t.tier_count);

insert into badge_rule (badge_id, rule_type, threshold)
select b.id, 'level_reached', t.tier_count
from (values (11), (12), (13), (14), (15), (16), (17), (18), (19), (20)) as t(tier_count)
join badge b on b.code = 'level_' || t.tier_count
where not exists (select 1 from badge_rule where badge_id = b.id);
