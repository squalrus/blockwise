-- Backfills mushroom_collection's new neighborhood_id source (added in
-- 20260822030000) from existing neighborhood_member rows, so accounts that
-- joined a neighborhood before this feature shipped don't miss out on a
-- species they already qualify for. Forward-looking recording
-- (POST /neighborhoods/:id/join) already covers everything from here on --
-- this is a one-time catch-up, mirroring 20260818030000_backfill_mushroom_
-- collection.sql's shape.
--
-- revealed_at is left at its default (null) for every backfilled row, same
-- as 20260818030000's checkin/connection backfill -- existing accounts get
-- to flip through these newly-backfilled species too, rather than only ever
-- seeing the reveal moment on species collected from here on.
--
-- quantity is always 1 here -- neighborhood_member only holds the *current*
-- membership, not a history of past leave/rejoin cycles, so (mirroring
-- 20260818030000's own connections backfill, which has the same limitation
-- for user_connection) there's no way to backfill a true repeat count.
insert into mushroom_collection (user_id, neighborhood_id, quantity, first_collected_at)
select nm.user_id, nm.neighborhood_id, 1, nm.created_at
from neighborhood_member nm
where not exists (
  select 1 from mushroom_collection mc
  where mc.user_id = nm.user_id and mc.neighborhood_id = nm.neighborhood_id
);
