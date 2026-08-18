-- Corrects 20260818050000: that migration was already applied against the
-- hosted database with an earlier draft that backfilled
-- revealed_at = first_collected_at for every pre-existing row. The final
-- design (BACKLOG.md Ref 98 follow-up) is for every row -- including ones
-- that predate the reveal mechanic -- to start unrevealed, so existing
-- accounts get the flip-to-reveal moment retroactively too. Editing the
-- already-applied migration file wouldn't re-run it, so this clears the
-- column back to null as a follow-up migration instead.
update mushroom_collection set revealed_at = null;
