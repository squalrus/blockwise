-- Hide/unhide for events (BACKLOG.md Ref 30 follow-up): a hard delete
-- doesn't work for iCal-imported events -- the next "Sync now" just
-- re-upserts the same UID and brings it right back. A status column that
-- survives re-syncs lets an admin hide a specific imported event (or a
-- manual one) without excluding it from future syncs.
--
-- upsertImportedEvents (supabaseRepository.ts) deliberately never includes
-- status in its upsert payload, so a re-sync's ON CONFLICT DO UPDATE leaves
-- an already-hidden row's status untouched -- only a brand-new row gets the
-- column default below.

alter table event add column status text not null default 'active' check (status in ('active', 'hidden'));
