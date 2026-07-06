-- Data layer MVP schema (README §1.3): Neighborhood, Category, Venue, POI,
-- VenueEnrichmentCache. All tables have RLS enabled with no policies, so
-- only the service-role key (used server-side in apps/api) can read/write
-- until policies are added deliberately.

create extension if not exists postgis;

create table neighborhood (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  city text not null,
  state text not null,
  country text not null,
  timezone text not null,
  boundary_geojson geometry(polygon, 4326),
  center_lat double precision not null,
  center_lng double precision not null,
  status text not null default 'onboarding' check (status in ('onboarding', 'active')),
  created_at timestamptz not null default now()
);

create index neighborhood_boundary_geojson_idx on neighborhood using gist (boundary_geojson);

alter table neighborhood enable row level security;

create table category (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  parent_category_id uuid references category (id),
  source_mapping_json jsonb not null default '{}'::jsonb
);

create index category_parent_category_id_idx on category (parent_category_id);

alter table category enable row level security;

create table venue (
  id uuid primary key default gen_random_uuid(),
  google_place_id text unique,
  name text not null,
  category_id uuid references category (id),
  lat double precision not null,
  lng double precision not null,
  address text not null,
  neighborhood_id uuid not null references neighborhood (id),
  claimed_by_business boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index venue_neighborhood_id_idx on venue (neighborhood_id);
create index venue_category_id_idx on venue (category_id);

alter table venue enable row level security;

create function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger venue_set_updated_at
  before update on venue
  for each row
  execute function set_updated_at();

create table poi (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references venue (id) on delete cascade,
  name text not null,
  description text,
  type text not null
);

create index poi_venue_id_idx on poi (venue_id);

alter table poi enable row level security;

-- One row per venue per enrichment source; refreshed in place (see README
-- §1.4 step 4) rather than appended, so (venue_id, source) is the natural key.
create table venue_enrichment_cache (
  venue_id uuid not null references venue (id) on delete cascade,
  source text not null check (source in ('google')),
  rating numeric,
  review_snippet text,
  price_tier text,
  photo_url text,
  fetched_at timestamptz not null default now(),
  primary key (venue_id, source)
);

alter table venue_enrichment_cache enable row level security;
