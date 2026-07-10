-- Generalize venue_enrichment_cache to also key on a POI, mirroring the
-- nullable checkin.venue_id/poi_id pattern (20260707030000_checkin_poi_target.sql)
-- -- POIs and venues are often the same underlying Google Place
-- (poi.google_place_id, e.g. via "convert venue to POI") but only venues got
-- rating/hours/photos/reviews before this migration (BACKLOG.md Ref 59).
alter table venue_enrichment_cache drop constraint venue_enrichment_cache_pkey;
alter table venue_enrichment_cache add column id uuid primary key default gen_random_uuid();
alter table venue_enrichment_cache alter column venue_id drop not null;
alter table venue_enrichment_cache add column poi_id uuid references poi (id) on delete cascade;
alter table venue_enrichment_cache add constraint venue_enrichment_cache_target_check check (
  (venue_id is not null and poi_id is null) or
  (venue_id is null and poi_id is not null)
);

-- Postgres treats each NULL as distinct for uniqueness purposes, so a
-- regular (non-partial) unique constraint on each pair still enforces
-- "at most one row per venue+source" / "at most one row per poi+source"
-- without colliding across the many now-NULL venue_id or poi_id rows.
alter table venue_enrichment_cache add constraint venue_enrichment_cache_venue_source_key unique (venue_id, source);
alter table venue_enrichment_cache add constraint venue_enrichment_cache_poi_source_key unique (poi_id, source);
