-- Neighborhood admin invites (BACKLOG.md). Replaces the shared ADMIN_API_TOKEN
-- secret with per-account admin roles: presence of a row here is what
-- requireAdmin (apps/api/src/admin/requireAdmin.ts) checks, instead of a
-- header matching an env secret. Additive to app_user.account_type (consumer/
-- business) rather than a replacement for it -- an account can be a consumer,
-- a claimed business owner, and a neighborhood admin all at once.

create table neighborhood_admin (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_user (id) on delete cascade,
  neighborhood_id uuid not null references neighborhood (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, neighborhood_id)
);

create index neighborhood_admin_user_id_idx on neighborhood_admin (user_id);

alter table neighborhood_admin enable row level security;
