-- Backfills the "founder" badge (seeded in 20260707060000_founder_badge.sql)
-- onto every account that already existed when auto-award shipped. Excludes
-- anonymous device rows -- the forward-looking award only ever fires at
-- account signup (apps/api/src/gamification/founderBadge.ts), so backfilled
-- accounts should match that same population.

insert into user_badge (user_id, badge_id)
select u.id, b.id
from app_user u, badge b
where b.code = 'founder'
  and u.is_anonymous = false
  and not exists (
    select 1 from user_badge ub where ub.user_id = u.id and ub.badge_id = b.id
  );
