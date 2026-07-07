-- User profiles with public or private visibility (BACKLOG.md). Foundation
-- for Connect with other users, Activity feed of recent check-ins, and
-- Business visitor history -- all three need a per-user visibility setting
-- before showing anyone else's activity, since a signed-in identity (v0.8.0)
-- doesn't by itself imply the user wants their presence visible to others.
--
-- Private-by-default: an anonymous device has no profile to show (it stays
-- null/private until the row is claimed via signup), and a freshly signed-up
-- account doesn't opt into visibility just by existing.
alter table app_user
  add column display_name text,
  add column avatar_url text,
  add column visibility text not null default 'private' check (visibility in ('public', 'private'));
