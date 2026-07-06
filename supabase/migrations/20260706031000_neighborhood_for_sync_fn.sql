-- Exposes a neighborhood's boundary as GeoJSON explicitly via st_asgeojson,
-- rather than relying on PostgREST's default (non-GeoJSON) serialization of
-- the `geometry` column, so the sync (apps/api/src/places) gets a
-- predictable shape back over the Supabase client.
create or replace function get_neighborhood_for_sync(p_slug text)
returns table (
  id uuid,
  center_lat double precision,
  center_lng double precision,
  boundary_geojson json
)
language sql
stable
as $$
  select id, center_lat, center_lng, st_asgeojson(boundary_geojson)::json
  from neighborhood
  where slug = p_slug;
$$;
