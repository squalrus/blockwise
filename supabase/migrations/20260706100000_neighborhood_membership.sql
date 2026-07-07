-- Neighborhood membership (BACKLOG.md "Neighborhoods on landing page and user
-- profile"): lets a signed-in user join a neighborhood (shown on their
-- profile and used to populate the landing page's "your neighborhoods"
-- section), plus an is_primary flag marking their "home" neighborhood.
-- Sign-in required -- unlike favorite (device-scoped, BACKLOG.md), this has
-- no payoff for an anonymous device since both surfaces it feeds (My account,
-- home neighborhood) already require a real account.

create table neighborhood_member (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_user (id) on delete cascade,
  neighborhood_id uuid not null references neighborhood (id) on delete cascade,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, neighborhood_id)
);

create index neighborhood_member_user_id_idx on neighborhood_member (user_id);
create index neighborhood_member_neighborhood_id_idx on neighborhood_member (neighborhood_id);

-- At most one home neighborhood per user.
create unique index neighborhood_member_one_primary_per_user
  on neighborhood_member (user_id)
  where is_primary;

alter table neighborhood_member enable row level security;
