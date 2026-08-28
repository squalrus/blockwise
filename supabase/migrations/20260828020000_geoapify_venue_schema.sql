-- Phase 3 of the Google Places -> Geoapify migration
-- (docs/geoapify-migration-plan.md): rename venue.google_place_id to
-- geoapify_place_id, and trim venue_enrichment_cache down to what Geoapify's
-- Place Details API can actually provide. Ratings, reviews, and photo
-- galleries are removed as product features entirely (no Geoapify
-- equivalent, decision recorded in the migration plan), not just relabeled.
-- price_tier/atmosphere are dropped too -- Geoapify has no direct
-- price_level field, and atmosphere (delivery/dine_in/takeout/etc.) was a
-- Google-specific field set with no confirmed OSM-tag equivalent.
--
-- Schema-only step: sync.ts/review.ts/investigate.ts/refresh.ts still call
-- Google's live API under the hood until Phase 4 rewires the actual client,
-- so geoapify_place_id holds a real Google place ID for now -- an accepted
-- temporary regression, matching Phase 2's category-taxonomy rename.

alter table venue rename column google_place_id to geoapify_place_id;
alter table venue rename constraint venue_google_place_id_neighborhood_id_key
  to venue_geoapify_place_id_neighborhood_id_key;

alter table venue_enrichment_cache
  drop column rating,
  drop column reviews,
  drop column price_tier,
  drop column photo_refs,
  drop column atmosphere;

alter table venue_enrichment_cache drop constraint venue_enrichment_cache_source_check;
update venue_enrichment_cache set source = 'geoapify' where source = 'google';
alter table venue_enrichment_cache add constraint venue_enrichment_cache_source_check
  check (source in ('geoapify'));
