-- BACKLOG.md Ref 98 follow-up: extends the collection_milestone badge tier
-- (20260818020000, which stopped at 100) up to 1000 in steps of 50. 100 is
-- included in the values list below for a complete/self-documenting range,
-- but is a no-op -- 'forager_100' already exists from the first tier, and
-- the same "where not exists" idempotency guard that migration used skips
-- it here too.

insert into badge (code, name, description, icon)
select
  'forager_' || t.tier_count,
  t.tier_count || '-Species Forager',
  'Collected ' || t.tier_count || ' mushroom species.',
  'mushroom'
from (values
  (100), (150), (200), (250), (300), (350), (400), (450), (500),
  (550), (600), (650), (700), (750), (800), (850), (900), (950), (1000)
) as t(tier_count)
where not exists (select 1 from badge where code = 'forager_' || t.tier_count);

insert into badge_rule (badge_id, rule_type, threshold)
select b.id, 'collection_milestone', t.tier_count
from (values
  (100), (150), (200), (250), (300), (350), (400), (450), (500),
  (550), (600), (650), (700), (750), (800), (850), (900), (950), (1000)
) as t(tier_count)
join badge b on b.code = 'forager_' || t.tier_count
where not exists (select 1 from badge_rule where badge_id = b.id);
