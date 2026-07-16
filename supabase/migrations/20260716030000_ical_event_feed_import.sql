-- iCal/webcal event feed import (BACKLOG.md Ref 30): lets a neighborhood or
-- a claimed business publish an external .ics/webcal calendar feed URL that
-- gets synced into the existing event table, instead of requiring every
-- event to be manually re-keyed via EventForm. Manual entry remains the
-- fallback -- imported rows are just event rows with source = 'ical'.
--
-- ical_feed_url lives on business_claim (not venue) for the same reason
-- social_links does (20260706120000_social_links.sql): it's owner-authored
-- business-profile data, edited via the approved-claim path
-- (getApprovedClaimSocialLinks/updateApprovedClaimSocialLinks), not synced
-- from Google Places like the rest of the venue row. POIs have no claim row
-- and so aren't feed-importable individually -- only neighborhood-level and
-- claimed-business feeds are supported.

alter table neighborhood add column ical_feed_url text;
alter table neighborhood add column ical_synced_at timestamptz;

alter table business_claim add column ical_feed_url text;
alter table business_claim add column ical_synced_at timestamptz;

-- 'ical' rows are upserted keyed by the feed's own UID on every re-sync;
-- 'manual' rows (the existing createEvent path) always have a null
-- external_uid and are never touched by a sync.
alter table event add column source text not null default 'manual' check (source in ('manual', 'ical'));
alter table event add column external_uid text;

-- Plain (non-partial) unique constraints: standard multi-column-unique NULL
-- semantics mean a row is only checked for a duplicate when *every* column
-- in the constraint is non-null, so manual rows (external_uid always null)
-- and the other owner type (whose own owner column is null on this row,
-- since event_owner_check keeps venue_id/neighborhood_id mutually exclusive)
-- are both automatically exempt -- only same-owner imported rows dedupe.
alter table event add constraint event_neighborhood_uid_unique unique (neighborhood_id, external_uid);
alter table event add constraint event_venue_uid_unique unique (venue_id, external_uid);
