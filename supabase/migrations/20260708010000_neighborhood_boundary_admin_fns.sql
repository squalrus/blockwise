-- Admin portal: neighborhood boundary drawing (BACKLOG.md Ref 8, project
-- plan §12.6/§12.3). PostgREST can't call st_geomfromgeojson/st_asgeojson
-- inline in an insert/update payload, so -- mirroring
-- get_neighborhood_for_sync's read-side approach -- these RPCs do the
-- geometry<->GeoJSON conversion in SQL. center_lat/center_lng are derived
-- from the polygon's centroid rather than passed separately, so they can
-- never drift from the boundary that produced them.

create or replace function get_neighborhood_boundary_for_admin(p_id uuid)
returns table (
  boundary_geojson json,
  center_lat double precision,
  center_lng double precision
)
language sql
stable
as $$
  select st_asgeojson(boundary_geojson)::json, center_lat, center_lng
  from neighborhood
  where id = p_id;
$$;

create or replace function set_neighborhood_boundary(p_id uuid, p_boundary_geojson text)
returns table (
  boundary_geojson json,
  center_lat double precision,
  center_lng double precision
)
language sql
as $$
  update neighborhood
  set
    boundary_geojson = st_setsrid(st_geomfromgeojson(p_boundary_geojson), 4326),
    center_lat = st_y(st_centroid(st_geomfromgeojson(p_boundary_geojson))),
    center_lng = st_x(st_centroid(st_geomfromgeojson(p_boundary_geojson)))
  where id = p_id
  returning st_asgeojson(boundary_geojson)::json, center_lat, center_lng;
$$;

-- Onboarding runbook step 1 (project plan §12.3): name/slug/city/state and
-- the drawn boundary are created together in one step, always starting in
-- 'onboarding' status (step 3 -- flipping to 'active' is a separate,
-- deliberate action once venue data is clean, not something this function
-- does).
create or replace function create_neighborhood(
  p_name text,
  p_slug text,
  p_city text,
  p_state text,
  p_country text,
  p_timezone text,
  p_boundary_geojson text
)
returns table (
  id uuid,
  name text,
  slug text,
  city text,
  state text,
  country text,
  timezone text,
  status text,
  boundary_geojson json,
  center_lat double precision,
  center_lng double precision
)
language sql
as $$
  insert into neighborhood (
    name, slug, city, state, country, timezone,
    boundary_geojson, center_lat, center_lng, status
  )
  values (
    p_name,
    p_slug,
    p_city,
    p_state,
    p_country,
    p_timezone,
    st_setsrid(st_geomfromgeojson(p_boundary_geojson), 4326),
    st_y(st_centroid(st_geomfromgeojson(p_boundary_geojson))),
    st_x(st_centroid(st_geomfromgeojson(p_boundary_geojson))),
    'onboarding'
  )
  returning
    id, name, slug, city, state, country, timezone, status,
    st_asgeojson(boundary_geojson)::json, center_lat, center_lng;
$$;
