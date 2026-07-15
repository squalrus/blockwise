-- "Reimport Locations" button (BACKLOG.md) -- lets an admin re-run the bulk
-- Places review directly from the Locations tab, rather than only from the
-- previously-buried .../locations/review sub-page. Limited to once per 24h
-- per neighborhood to bound Google Places API usage (a real project's
-- SearchNearbyRequest-per-minute quota was exhausted by repeated manual
-- runs during development) -- this timestamp is the server-side source of
-- truth for that cooldown, checked and stamped in the API, not just hidden
-- behind a disabled button in the UI.
alter table neighborhood
  add column locations_reviewed_at timestamptz;

-- CREATE OR REPLACE can't change a function's OUT-parameter row shape
-- (SQLSTATE 42P13) -- both RPCs below are gaining a new output column, so
-- the old signatures must be dropped first.
drop function if exists get_neighborhood_boundary_for_admin(uuid);
drop function if exists set_neighborhood_boundary(uuid, text);

create function get_neighborhood_boundary_for_admin(p_id uuid)
returns table (
  boundary_geojson json,
  center_lat double precision,
  center_lng double precision,
  locations_reviewed_at timestamptz
)
language sql
stable
as $$
  select st_asgeojson(boundary_geojson)::json, center_lat, center_lng, locations_reviewed_at
  from neighborhood
  where id = p_id;
$$;

-- Echoes locations_reviewed_at back unchanged -- a boundary redraw doesn't
-- reset the reimport cooldown, but NeighborhoodBoundaryRecord's shape is
-- shared between both RPCs' callers.
create function set_neighborhood_boundary(p_id uuid, p_boundary_geojson text)
returns table (
  boundary_geojson json,
  center_lat double precision,
  center_lng double precision,
  locations_reviewed_at timestamptz
)
language sql
as $$
  update neighborhood
  set
    boundary_geojson = st_setsrid(st_geomfromgeojson(p_boundary_geojson), 4326),
    center_lat = st_y(st_centroid(st_geomfromgeojson(p_boundary_geojson))),
    center_lng = st_x(st_centroid(st_geomfromgeojson(p_boundary_geojson)))
  where id = p_id
  returning st_asgeojson(boundary_geojson)::json, center_lat, center_lng, locations_reviewed_at;
$$;

-- Widen venue.status (originally 'active'/'hidden', 20260708020000): a
-- location whose boundary-removal was approved during a review run is fully
-- detached from the neighborhood -- if its Google place is ever
-- re-discovered later (e.g. the boundary is redrawn to include that area
-- again), it should be treated as a brand-new candidate needing a fresh
-- classification, not a still-known one. That's different from 'hidden',
-- which the admin Locations tab can still surface via "Show hidden" --
-- 'removed' rows never appear there regardless of that toggle.
alter table venue drop constraint venue_status_check;
alter table venue add constraint venue_status_check check (status in ('active', 'hidden', 'removed'));
