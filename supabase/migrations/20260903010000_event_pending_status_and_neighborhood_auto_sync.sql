-- Pending-review workflow for iCal-imported events, plus per-neighborhood
-- nightly auto-sync settings.
--
-- event.status gains 'pending' -- the new default for a newly-imported event
-- (whether from a manual "Sync now" or the nightly auto-sync job below),
-- unless the neighborhood has ical_auto_approve_events on, in which case
-- imports go straight to 'active' as they always have. Already-synced rows
-- are untouched: upsertImportedEvents still never writes status on conflict,
-- so this only affects events imported after this migration.
alter table event drop constraint event_status_check;
alter table event add constraint event_status_check check (status in ('active', 'hidden', 'pending'));

-- ical_auto_sync_enabled: lets a neighborhood admin opt into a nightly sync
-- of their configured ical_feed_url instead of relying on manual "Sync now"
-- clicks (see apps/api/netlify/functions/ical-nightly-sync.ts).
-- ical_auto_approve_events: "this feed is trusted" -- skips the pending
-- review queue entirely, matching today's behavior (import straight to
-- 'active') for neighborhoods that opt in.
alter table neighborhood add column ical_auto_sync_enabled boolean not null default false;
alter table neighborhood add column ical_auto_approve_events boolean not null default false;
