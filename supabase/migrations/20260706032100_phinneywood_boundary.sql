-- seed.sql's boundary_geojson value only reaches a fresh database (local
-- `supabase db reset`) -- it does not get re-run against an already-seeded
-- hosted project via `supabase db push`. This UPDATE delivers the same
-- hand-authored placeholder polygon (see seed.sql for the caveat: rough,
-- not surveyed, superseded once the admin boundary-drawing tool, §12.6,
-- ships) to a Phinneywood row that was already inserted before this
-- migration existed. No-ops if the row doesn't exist yet or already has a
-- boundary set.
update neighborhood
set boundary_geojson = st_setsrid(st_geomfromgeojson('{
  "type": "Polygon",
  "coordinates": [[
    [-122.3605, 47.6960],
    [-122.3480, 47.6960],
    [-122.3460, 47.6750],
    [-122.3480, 47.6580],
    [-122.3560, 47.6560],
    [-122.3620, 47.6650],
    [-122.3620, 47.6850],
    [-122.3605, 47.6960]
  ]]
}'), 4326)
where slug = 'phinneywood-seattle'
  and boundary_geojson is null;
