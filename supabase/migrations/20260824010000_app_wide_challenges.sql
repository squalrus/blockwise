-- BACKLOG.md Ref 108: split challenges into app-wide vs neighborhood-specific
-- scopes. Badges/badge_rule are already app-wide by construction (no
-- neighborhood_id column at all); challenge is the half of the gamification
-- schema that had no escape hatch -- neighborhood_id was not null with no
-- way to express "this challenge applies everywhere". A null neighborhood_id
-- now means app-wide; a set value keeps today's meaning unchanged for every
-- existing row (purely additive, no backfill).

alter table challenge alter column neighborhood_id drop not null;

-- An app-wide challenge can't target one specific venue -- a venue belongs
-- to exactly one neighborhood, so "any venue anywhere" implies category_id
-- or target_kind, never venue_id, once neighborhood_id is null.
alter table challenge add constraint challenge_scope_check check (
  neighborhood_id is not null or venue_id is null
);

-- point_event.neighborhood_id was already made nullable in
-- 20260712020000_neighbor_connection_rewards.sql (for neighbor_connection
-- events), so an app-wide challenge's completion award needs no schema
-- change there -- it just writes a null neighborhood_id, same mechanism.
