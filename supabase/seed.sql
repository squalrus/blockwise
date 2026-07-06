-- First-launch neighborhood (README §12.4). Boundary polygon is drawn later
-- via the admin portal (§12.6), so boundary_geojson stays null until then and
-- status stays 'onboarding' until venue data/business claiming are ready.
insert into neighborhood (name, slug, city, state, country, timezone, center_lat, center_lng, status)
values (
  'Phinneywood',
  'phinneywood-seattle',
  'Seattle',
  'WA',
  'US',
  'America/Los_Angeles',
  47.6686,
  -122.3550,
  'onboarding'
);
