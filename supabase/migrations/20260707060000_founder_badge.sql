-- Founding member badge (BACKLOG.md Ref 50) -- seeds the badge row itself.
-- Every account gets it automatically while pre-launch: new signups via
-- apps/api/src/gamification/founderBadge.ts, existing accounts backfilled in
-- 20260707070000_founder_badge_backfill.sql. Turn the auto-award off once
-- v1.0.0 ships (BACKLOG.md Ref 52).

insert into badge (code, name, description, icon)
select 'founder', 'Founder', 'Joined Blockwise before its public launch.', 'star'
where not exists (select 1 from badge where code = 'founder');
