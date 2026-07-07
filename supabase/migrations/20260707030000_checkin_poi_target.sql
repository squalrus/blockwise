-- Check-ins can now target a neighborhood POI in addition to a venue
-- (Challenges + badges/points, BACKLOG.md Ref 6 -- "check in to 1 POI").
alter table checkin alter column venue_id drop not null;
alter table checkin add column poi_id uuid references poi (id) on delete cascade;
alter table checkin add constraint checkin_target_check check (
  (venue_id is not null and poi_id is null) or
  (venue_id is null and poi_id is not null)
);

create index checkin_user_poi_checked_in_at_idx on checkin (user_id, poi_id, checked_in_at desc);

-- Backs the global cross-venue cooldown (any check-in, not just this
-- venue/POI) -- without this, a user could satisfy a multi-venue challenge
-- like "check in to 5 coffee shops" in seconds by scripting or rapid-tapping
-- through nearby venues.
create index checkin_user_checked_in_at_idx on checkin (user_id, checked_in_at desc);
