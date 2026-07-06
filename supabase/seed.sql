-- First-launch neighborhood (README §12.4). boundary_geojson below is a
-- hand-authored placeholder polygon around the Greenwood Ave N / Phinney
-- Ave N business corridor -- rough, not surveyed -- so the Google Places
-- sync (§1.4) has a real area to scope against before the admin
-- boundary-drawing tool (§12.6, BACKLOG "Admin portal: neighborhood boundary
-- drawing") exists. Redraw it properly with that tool once it ships; status
-- stays 'onboarding' until venue data/business claiming are ready.
insert into neighborhood (name, slug, city, state, country, timezone, boundary_geojson, center_lat, center_lng, status)
values (
  'Phinneywood',
  'phinneywood-seattle',
  'Seattle',
  'WA',
  'US',
  'America/Los_Angeles',
  st_setsrid(st_geomfromgeojson('{
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
  }'), 4326),
  47.6686,
  -122.3550,
  'onboarding'
);
