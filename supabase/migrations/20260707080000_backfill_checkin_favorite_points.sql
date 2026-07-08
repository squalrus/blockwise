-- Backfills points/badges (v0.22.0, BACKLOG.md Ref 49) onto check-ins and
-- favorites made before that shipped, so early users' leaderboard totals
-- reflect their real activity. Respects the same uniqueness rules the live
-- award path enforces (point_event_checkin_id_idx, point_event_favorite_venue_idx
-- from 20260707040000_points_badges_challenges.sql), so this is safe to run
-- alongside rows the live app has already awarded. Point values (10/5) match
-- CHECKIN_POINTS/FAVORITE_POINTS in apps/api/src/gamification/points.ts.

insert into point_event (user_id, neighborhood_id, event_type, points, venue_id, poi_id, checkin_id, created_at)
select
  c.user_id,
  coalesce(v.neighborhood_id, p.neighborhood_id),
  'checkin',
  10,
  c.venue_id,
  c.poi_id,
  c.id,
  c.checked_in_at
from checkin c
left join venue v on v.id = c.venue_id
left join poi p on p.id = c.poi_id
where not exists (select 1 from point_event pe where pe.checkin_id = c.id);

insert into point_event (user_id, neighborhood_id, event_type, points, venue_id, created_at)
select
  f.user_id,
  v.neighborhood_id,
  'favorite',
  5,
  f.venue_id,
  f.created_at
from favorite f
join venue v on v.id = f.venue_id
where not exists (
  select 1 from point_event pe
  where pe.event_type = 'favorite' and pe.user_id = f.user_id and pe.venue_id = f.venue_id
);
