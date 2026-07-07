-- Public user profiles (BACKLOG.md Ref 37). Builds on the visibility column
-- from 20260707000000: a profile is only reachable publicly when visibility
-- is 'public', gating both the profile page and its recent-checkins section
-- since checkin has no per-row privacy field of its own.
--
-- Public profiles need a stable, user-chosen, URL-safe handle rather than the
-- internal UUID -- mirrors neighborhood.slug's role for /neighborhoods/:slug.
-- Nullable and unset by default: existing accounts (and anonymous ones) have
-- no username until they choose one via PATCH /me/profile, and an unset
-- username keeps a profile unreachable at /profile/:username even if
-- visibility is public.
alter table app_user
  add column username text unique check (username is null or username ~ '^[a-z0-9_-]{3,30}$');
