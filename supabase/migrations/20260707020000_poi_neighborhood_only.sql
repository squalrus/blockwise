-- POI's venue_id parent was never actually writable (BACKLOG.md "Google Maps
-- POI import" Ref 29's precursor never shipped a venue-owned POI writer --
-- only the sync pipeline was ever slated to populate it, and never did).
-- Neighborhood-owned POI (added in 20260706090000_neighborhood_profile.sql)
-- is the only path with a real create API, so simplify POI to always be
-- neighborhood-scoped and drop the dead venue_id option.
alter table poi drop constraint poi_owner_check;
alter table poi drop column venue_id;
alter table poi alter column neighborhood_id set not null;

-- Location is required so a POI can be a GPS-verified check-in target
-- (Challenges + badges/points, BACKLOG.md Ref 6), same geofence approach as
-- venue check-ins. Nullable for now since existing rows predate this column;
-- enforced at the API layer for new POIs.
alter table poi add column lat double precision;
alter table poi add column lng double precision;
