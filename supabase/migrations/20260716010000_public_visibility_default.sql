-- Flips new-account default visibility from private to public
-- (20260707000000_user_profile_visibility.sql originally shipped
-- private-by-default). Public profiles are now the norm -- a new signup's
-- badges/check-in count/neighbor count are visible to others unless they
-- opt into Private from Account settings. Only changes the column default
-- for future inserts; existing accounts keep whatever visibility they
-- already have.
alter table app_user
  alter column visibility set default 'public';
