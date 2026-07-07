-- Business owner venue dashboard (BACKLOG.md). Adds the two content types a
-- claimed business owner can author from the dashboard -- Announcement (a
-- one-off update, README §5/§1.8) and Event (a scheduled, time-boxed
-- listing, README §1.8/§11.1) -- scoped to a single venue. No moderation
-- queue or entitlement/credit gating yet (README §5's "basic moderation
-- queue" and §11's credit system are separate, later backlog items); every
-- announcement is published immediately and every venue gets unlimited
-- creates for now.

create table announcement (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references venue (id) on delete cascade,
  title text not null,
  body text not null,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create index announcement_venue_id_created_at_idx on announcement (venue_id, created_at desc);

alter table announcement enable row level security;

create table event (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references venue (id) on delete cascade,
  title text not null,
  description text not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  created_at timestamptz not null default now()
);

create index event_venue_id_start_time_idx on event (venue_id, start_time);

alter table event enable row level security;
