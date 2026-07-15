-- "Visit every POI"'s target_count was a one-time snapshot of the active POI
-- count taken when 20260710030000_challenge_any_poi_target.sql ran (3 at the
-- time) -- it doesn't move when POIs are added/hidden afterward, so it's
-- already stale (4 POIs are active today). Add a flag so completionist-style
-- challenges can resolve their target live instead of trusting the stored
-- column, while ordinary fixed-count challenges (e.g. "Visit any POI",
-- target_count=1) are unaffected.
alter table challenge add column target_count_live boolean not null default false;

update challenge set target_count_live = true, target_count = (
  select count(*) from venue
  where venue.neighborhood_id = challenge.neighborhood_id
    and venue.kind = 'poi'
    and venue.status = 'active'
)
where title = 'Visit every POI';
