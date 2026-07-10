-- Merge venue and poi into one entity with a switchable kind (BACKLOG.md --
-- "POIs and venues managed almost the same"). Both tables were already
-- structurally near-identical (id/name/lat/lng/address/neighborhood_id/
-- status/created_at, and both key into venue_enrichment_cache as of
-- 20260710010000). Unifying into one table with a `kind` column makes
-- switching an existing location between "business" and "poi" a single
-- UPDATE -- no id changes, no per-switch data migration -- instead of
-- today's hide-then-manually-recreate-as-a-new-row flow.

-- 1. Extend venue with the columns poi carries that venue doesn't.
alter table venue add column kind text not null default 'business' check (kind in ('business', 'poi'));
alter table venue add column type text;
alter table venue add column description text;
-- poi.lat/lng/address are all nullable (legacy pre-lat/lng rows, optional
-- address) -- venue's NOT NULL constraints would reject those rows on copy.
alter table venue alter column lat drop not null;
alter table venue alter column lng drop not null;
alter table venue alter column address drop not null;
create index venue_kind_idx on venue (neighborhood_id, kind);

-- 2. Auto-resolve google_place_id collisions before the poi copy below.
-- venue.google_place_id is unique; the "Convert to POI" flow historically
-- copied a venue's google_place_id onto a new poi row without clearing it
-- from the old (hidden) venue row, so a colliding pair may already exist.
-- Where the old venue row has no dependent history, it's a pure duplicate
-- of what's about to become the poi-kind row -- delete it. Where it does
-- have history (checkin/favorite/claim/announcement/event/point_event),
-- keep it but drop its google_place_id so the poi copy doesn't collide;
-- both rows then persist for manual admin cleanup.
with colliding as (
  select v.id
  from venue v
  join poi p on p.google_place_id = v.google_place_id
  where v.google_place_id is not null
),
has_history as (
  select c.id
  from colliding c
  where exists (select 1 from checkin where venue_id = c.id)
     or exists (select 1 from favorite where venue_id = c.id)
     or exists (select 1 from business_claim where venue_id = c.id)
     or exists (select 1 from announcement where venue_id = c.id)
     or exists (select 1 from event where venue_id = c.id)
     or exists (select 1 from point_event where venue_id = c.id)
)
delete from venue where id in (select id from colliding except select id from has_history);

update venue set google_place_id = null
where id in (
  select v.id
  from venue v
  join poi p on p.google_place_id = v.google_place_id
  where v.google_place_id is not null
);

-- 3. Copy poi rows into venue, preserving id (safe: independent UUID
-- spaces, collision probability negligible).
insert into venue (
  id, google_place_id, name, category_id, lat, lng, address, neighborhood_id,
  claimed_by_business, status, created_at, updated_at, kind, type, description
)
select
  id, google_place_id, name, null, lat, lng, address, neighborhood_id,
  false, status, created_at, updated_at, 'poi', type, description
from poi;

-- 4. Backfill poi_id -> venue_id on every table that had a poi_id column,
-- then drop poi_id -- both kinds now live in venue, keyed by venue_id only.

-- venue_enrichment_cache
-- Constraint drops must happen before the update: venue_enrichment_cache_target_check
-- requires exactly one of venue_id/poi_id to be non-null, and the update
-- below makes both non-null for the rows it touches.
alter table venue_enrichment_cache drop constraint venue_enrichment_cache_target_check;
alter table venue_enrichment_cache drop constraint venue_enrichment_cache_poi_source_key;
update venue_enrichment_cache set venue_id = poi_id where poi_id is not null;
alter table venue_enrichment_cache alter column venue_id set not null;
alter table venue_enrichment_cache drop column poi_id;

-- checkin
-- Same ordering requirement as above: checkin_target_check requires exactly
-- one of venue_id/poi_id, so it must be dropped before the update.
alter table checkin drop constraint checkin_target_check;
update checkin set venue_id = poi_id where poi_id is not null;
alter table checkin alter column venue_id set not null;
alter table checkin drop column poi_id;
drop index if exists checkin_user_poi_checked_in_at_idx;

-- point_event
update point_event set venue_id = poi_id where poi_id is not null;
alter table point_event drop column poi_id;

-- challenge -- never had a venue_id column, only poi_id.
alter table challenge add column venue_id uuid references venue (id) on delete cascade;
update challenge set venue_id = poi_id where poi_id is not null;
alter table challenge drop constraint challenge_target_check;
alter table challenge drop column poi_id;
alter table challenge add constraint challenge_target_check check (
  (category_id is not null and venue_id is null) or
  (category_id is null and venue_id is not null)
);

-- business_claim, favorite, announcement, event keep their existing
-- venue_id-only columns unchanged -- these remain business-kind-only
-- features, enforced at the application layer (a poi-kind row is never
-- expected to have a row in any of them).

-- 5. Drop the now-empty poi table.
drop table poi;
