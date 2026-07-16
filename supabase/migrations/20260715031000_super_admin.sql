-- Super admin (BACKLOG.md): a rung above neighborhood_admin/adminGate's
-- "admin of at least one neighborhood" -- bypasses the 24h "Reimport
-- Locations" cooldown (BACKLOG.md, 20260715020000) and, for now, is the only
-- role allowed to create a brand-new neighborhood at all (POST
-- /admin/neighborhoods), while the platform is still small enough that
-- unrestricted neighborhood creation isn't ready to open up. Mirrors
-- neighborhood_admin's shape (a plain grant table, no role column) rather
-- than a boolean column on app_user, matching this codebase's existing
-- role-as-table pattern (see 20260706070000_neighborhood_admin.sql).
create table super_admin (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_user (id) on delete cascade unique,
  created_at timestamptz not null default now()
);

create index super_admin_user_id_idx on super_admin (user_id);

alter table super_admin enable row level security;
