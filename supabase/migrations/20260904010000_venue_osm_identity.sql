-- Foundation fix (BACKLOG.md, live-verified 2026-09-04): venue.geoapify_place_id
-- was being treated as a stable identity key for dedup/"already known"
-- matching, but it isn't one -- live-verified against Geoapify's own API,
-- the SAME physical business ("Salon Opal", 549 N 85th St) returned three
-- different place_id strings from three different Geoapify endpoints
-- (v1/geocode/reverse, v2/places, v2/place-details) at the same instant,
-- with nothing in the real world having changed. The one property that
-- stayed identical across all three calls was the underlying OpenStreetMap
-- reference embedded in each response's datasource.raw: osm_type "w" +
-- osm_id 491979147. That pair is OSM's own durable identifier for the
-- feature (only queryable when Geoapify's source is OpenStreetMap, which is
-- the overwhelming majority of results here) and is what dedup/matching
-- should key on going forward.
--
-- geoapify_place_id is kept, not dropped -- Geoapify's Place Details API
-- (hours/phone/website enrichment) has no lookup-by-osm-reference mode
-- (confirmed live: v2/place-details?id=W491979147 -> 400 "Invalid Place
-- ID"), so a Geoapify-native place_id is still required to fetch
-- enrichment. Its role is demoted from identity key to a soft cache of "the
-- last place_id known to work for this location," opportunistically
-- refreshed whenever sync/Import re-matches the location by osm_type+osm_id
-- (locations.ts/sync.ts/review.ts). Its old per-neighborhood uniqueness is
-- dropped for the same reason it caused confusing 409s before this fix:
-- two rows can legitimately end up caching the same now-stale token without
-- that meaning anything is actually wrong.
--
-- Both new columns are nullable and *stay* nullable by design -- a manually
-- added location (PoiForm/AddLocationModal, or an Import "omit" placeholder)
-- has no Geoapify/OSM linkage at all until some future sync/Import run
-- happens to match it by name+location, at which point osm_type/osm_id (and
-- geoapify_place_id) get filled in then, not before.
alter table venue
  add column osm_type text,
  add column osm_id bigint;

alter table venue drop constraint venue_geoapify_place_id_neighborhood_id_key;

-- Postgres treats NULL as distinct from every other value (including
-- another NULL) in a unique constraint, so any number of rows with no OSM
-- linkage yet can coexist without colliding here.
alter table venue add constraint venue_osm_ref_neighborhood_id_key
  unique (neighborhood_id, osm_type, osm_id);

-- Enrichment-fetch failures (BACKLOG.md follow-up to the above): a cached
-- geoapify_place_id can go stale (Geoapify's own tokens aren't guaranteed
-- durable -- see this migration's main comment) and start failing at
-- Place Details lookup time. Previously that only surfaced as a
-- console.error in server logs (enrichment/refresh.ts), with no way for an
-- admin to know a location's link needs refreshing short of reading
-- production logs. Recording it on the row itself lets the admin Locations
-- list surface "this one's enrichment is failing, re-run Import" directly.
-- last_error_at is cleared (set back to null) on the next successful fetch,
-- so its mere presence means "still failing as of last attempt," not
-- "failed once, ever."
alter table venue_enrichment_cache
  add column last_error_at timestamptz,
  add column last_error_message text;
