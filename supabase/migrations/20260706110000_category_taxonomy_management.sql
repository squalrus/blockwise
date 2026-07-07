-- Category taxonomy management (BACKLOG.md Ref 4): admins can now create,
-- rename, and archive Category rows themselves rather than the taxonomy
-- being fixed at seed time. Archiving (not deleting) preserves the FK from
-- any venue/child-category still pointing at the row; the API guards
-- against archiving a category that's still in use (see
-- apps/api/src/categoryAdmin). Mirrors the status-enum pattern already used
-- by neighborhood.status and business_claim.status rather than introducing
-- a boolean is_archived flag.
alter table category
  add column status text not null default 'active' check (status in ('active', 'archived'));
