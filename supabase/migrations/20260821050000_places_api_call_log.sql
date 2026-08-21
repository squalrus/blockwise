-- Monitoring tab addition: self-instrumented outbound Google Places API
-- calls (BACKLOG.md Ref 104 follow-up), rather than pulling quota/cost data
-- from Google Cloud Monitoring -- avoids a new GCP service-account
-- credential just to see what our own server already knows it called.
-- Written by apps/api/src/places/instrumentedClient.ts, which wraps
-- LivePlacesClient (not MockPlacesClient, so local/dev mock calls don't
-- pollute this with activity that never hit Google).
create table places_api_call_log (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null check (endpoint in ('searchNearby', 'searchText', 'getPlaceDetails', 'fetchPhotoMedia')),
  success boolean not null,
  duration_ms int not null,
  created_at timestamptz not null default now()
);

create index places_api_call_log_created_at_idx on places_api_call_log (created_at desc);

alter table places_api_call_log enable row level security;
