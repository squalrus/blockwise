-- Backfills mushroom_collection (BACKLOG.md Ref 98, table added in
-- 20260818010000) from existing check-in and connection history, so
-- accounts already active before the forager collection feature shipped
-- don't start with an empty collection. Forward-looking recording
-- (POST /locations/:id/checkins, POST /me/connections/:id/accept) already
-- covers everything from here on -- this is a one-time catch-up for
-- everything before it, mirroring 20260708000001_backfill_missing_checkin_
-- favorite_points.sql's shape.
--
-- collection_milestone badge awards for any threshold this backfill crosses
-- aren't computed here -- that rule is only evaluated in the live app.ts
-- code path (recordVenueCollection/recordConnectionCollection's "was this
-- new" return value), so a bulk insert can't trigger it. Accounts that
-- cross a tier via this backfill simply pick up the badge on their next
-- check-in or connection, same as any other newly-crossed threshold.

-- Check-ins: one row per (user, venue) ever checked into, quantity = total
-- check-in count at that venue, first_collected_at = the earliest one.
-- Filtering out already-collected pairs before the group-by rather than
-- after is equivalent here (existence doesn't depend on the aggregates) and
-- matches the WHERE NOT EXISTS shape of the connections insert below.
insert into mushroom_collection (user_id, venue_id, quantity, first_collected_at)
select c.user_id, c.venue_id, count(*), min(c.checked_in_at)
from checkin c
where not exists (
  select 1 from mushroom_collection mc where mc.user_id = c.user_id and mc.venue_id = c.venue_id
)
group by c.user_id, c.venue_id;

-- Connections: one row per side of every currently-accepted connection.
-- quantity is always 1 here -- user_connection only holds the *current*
-- relationship, not a history of past disconnect/reconnect cycles, so
-- there's no way to backfill a true repeat count (point_event's own
-- neighbor_connection ledger is uniqueness-guarded the same way and
-- wouldn't help either).
insert into mushroom_collection (user_id, connection_user_id, quantity, first_collected_at)
select uc.requester_id, uc.recipient_id, 1, coalesce(uc.responded_at, uc.created_at)
from user_connection uc
where uc.status = 'accepted'
  and not exists (
    select 1 from mushroom_collection mc
    where mc.user_id = uc.requester_id and mc.connection_user_id = uc.recipient_id
  )
union all
select uc.recipient_id, uc.requester_id, 1, coalesce(uc.responded_at, uc.created_at)
from user_connection uc
where uc.status = 'accepted'
  and not exists (
    select 1 from mushroom_collection mc
    where mc.user_id = uc.recipient_id and mc.connection_user_id = uc.requester_id
  );
