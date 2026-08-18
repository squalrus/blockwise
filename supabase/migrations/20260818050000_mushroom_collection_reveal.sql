-- Forager collection "reveal" mechanic (BACKLOG.md Ref 98 follow-up): a
-- collected species starts face-down on the Collection tab until the user
-- taps to flip it over -- revealed_at null means not yet revealed. Every
-- row, including ones recorded live before this migration or backfilled in
-- 20260818030000, starts unrevealed too (no backfill-to-revealed step here)
-- -- existing accounts get to flip through their whole collection retroactively
-- rather than only ever seeing the reveal moment on species collected from
-- here on.
alter table mushroom_collection add column revealed_at timestamptz;
