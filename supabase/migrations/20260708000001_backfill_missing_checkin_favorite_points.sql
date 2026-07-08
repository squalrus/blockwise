-- Re-runs the v0.24.0 points backfill (20260707080000_backfill_checkin_favorite_points.sql)
-- to recover points lost to the mergeAnonymousHistory cascade-delete bug
-- fixed in 20260708000000_fix_merge_anonymous_history_data_loss.sql: any
-- check-in/favorite whose point_event got cascade-deleted when its
-- anonymous app_user row was removed during a login merge, even though the
-- checkin/favorite row itself survived (already reassigned to the account
-- by that point). Same "not exists" guards as the original backfill, so
-- this is a no-op for rows that already have their point_event.

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
