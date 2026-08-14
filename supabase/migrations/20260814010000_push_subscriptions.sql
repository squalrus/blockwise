-- Web push subscriptions for the PWA install/push feature (BACKLOG.md Ref 89).
-- One row per browser/device subscription; a user can hold several (multiple
-- devices/browsers). `endpoint` is unique per subscription -- re-subscribing
-- the same browser (e.g. after a permission reset) upserts in place rather
-- than accumulating duplicates.
create table push_subscription (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_user (id) on delete cascade,
  endpoint text not null unique,
  keys jsonb not null,
  created_at timestamptz not null default now()
);

create index push_subscription_user_id_idx on push_subscription (user_id);

alter table push_subscription enable row level security;
