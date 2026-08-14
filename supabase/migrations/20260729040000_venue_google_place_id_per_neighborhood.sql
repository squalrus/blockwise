-- Same Google Place can now belong to more than one neighborhood
-- (BACKLOG.md "Reimport Locations" follow-up). google_place_id was
-- globally unique, so a location removed from one neighborhood (status =
-- "removed", the row itself kept forever for checkin/favorite/point_event
-- history per Ref 54) permanently blocked every other neighborhood from
-- ever claiming that same place -- upsertVenue would silently reassign the
-- old (still "removed") row instead of creating a fresh one, and the POI
-- create path would hit a raw unique-violation. Scoping uniqueness to
-- (google_place_id, neighborhood_id) instead lets a border business, or a
-- place one neighborhood dropped that another later covers, be claimed
-- independently by each neighborhood as its own row with its own history.
alter table venue drop constraint venue_google_place_id_key;
alter table venue add constraint venue_google_place_id_neighborhood_id_key unique (google_place_id, neighborhood_id);
