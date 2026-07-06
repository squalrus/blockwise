-- Business claiming + GPS check-in (BACKLOG.md). Adds the anonymous-first
-- User model (README §14.2) that check-ins attach to, a claim-request queue
-- for business claiming (README §5) with manual/admin approval rather than
-- automated phone/email OTP verification, and the check-in log itself
-- (README §4 Phase 1: GPS geofence, with cooldown to prevent streak gaming).
-- All tables enable RLS with no policies, matching every other table so far
-- -- only the service-role key (used server-side in apps/api) can read/write.

-- README §14.2: every device gets a row here from first launch, whether or
-- not it's ever backed by real credentials. "user" is a reserved word in
-- Postgres, so this is named app_user instead.
create table app_user (
  id uuid primary key default gen_random_uuid(),
  is_anonymous boolean not null default true,
  anonymous_device_id text unique,
  auth_provider text,
  email text,
  phone text,
  created_at timestamptz not null default now()
);

alter table app_user enable row level security;

-- README §5: a claimed-listing request, reviewed by an admin rather than
-- verified automatically -- no SMS/email provider is wired into this project
-- yet, so contact info is captured for manual follow-up instead of an OTP
-- flow. Approving a claim is what flips venue.claimed_by_business to true.
create table business_claim (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references venue (id) on delete cascade,
  contact_name text not null,
  contact_method text not null check (contact_method in ('phone', 'email', 'domain')),
  contact_value text not null,
  note text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_note text
);

create index business_claim_venue_id_idx on business_claim (venue_id);
create index business_claim_status_idx on business_claim (status);

alter table business_claim enable row level security;

-- README §4 Phase 1: GPS geofence check-in against Venue.lat/lng. Cooldown
-- (README §4: "one check-in per venue per 4–6 hours") is enforced in
-- application logic against the most recent row per (user_id, venue_id)
-- rather than a DB constraint, since it's a rolling time window, not a
-- uniqueness rule.
create table checkin (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_user (id) on delete cascade,
  venue_id uuid not null references venue (id) on delete cascade,
  device_lat double precision not null,
  device_lng double precision not null,
  checked_in_at timestamptz not null default now()
);

create index checkin_user_venue_checked_in_at_idx on checkin (user_id, venue_id, checked_in_at desc);

alter table checkin enable row level security;
