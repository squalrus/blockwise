-- BACKLOG.md Ref 14/33 "Connect with other users" / "Friends/neighbors on
-- profile": a mutual, request-based relationship between two app_user rows,
-- called a "neighbor" in UI copy (neighborhood-flavored language instead of
-- "friend", per the user's ask). requester_id sends the request;
-- recipient_id accepts it. There is no "declined" status -- declining a
-- pending request, cancelling one, or removing an accepted connection are
-- all a hard delete of the row (see apps/api/src/connections), so status
-- only ever needs the two states below.
create table user_connection (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references app_user (id) on delete cascade,
  recipient_id uuid not null references app_user (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (requester_id <> recipient_id),
  unique (requester_id, recipient_id)
);

create index user_connection_requester_id_idx on user_connection (requester_id);
create index user_connection_recipient_id_idx on user_connection (recipient_id);

alter table user_connection enable row level security;
