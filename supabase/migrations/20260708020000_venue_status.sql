-- Venue omission (BACKLOG.md Ref 11): lets an admin hide a synced venue
-- without deleting it (preserves any existing checkin/favorite/claim FKs),
-- mirroring the status-enum pattern used by category.status rather than a
-- boolean. Only two states -- hidden is a pivot an admin can restore from
-- (back to active) or use as the basis for a new POI (apps/api/src/pois),
-- not a third representation of its own.
alter table venue
  add column status text not null default 'active' check (status in ('active', 'hidden'));

create index venue_status_idx on venue (neighborhood_id, status);

-- Standardizes POI with venue's Google Places linkage (BACKLOG.md Ref 29/46
-- both anticipate POIs eventually sourced from the same Places sync pipeline
-- as venues) -- nullable since every POI today is manually created with no
-- Places entity behind it. Unique, mirroring venue.google_place_id, so the
-- same Places entity can't end up imported as a POI twice down the line.
alter table poi
  add column google_place_id text unique,
  add column address text;
