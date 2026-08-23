-- Extends mushroom_collection (20260818010000) with a third species source:
-- a neighborhood's own mushroom "species", collected by joining it (mirrors
-- collecting a venue's species by checking in, or a neighbor's by
-- connecting -- joining a neighborhood is the neighborhood-level equivalent
-- of an explicit relationship action, not a passive/derived one like a
-- generic activity feed entry would be).
alter table mushroom_collection
  add column neighborhood_id uuid references neighborhood (id) on delete cascade;

alter table mushroom_collection
  drop constraint mushroom_collection_target_check;

alter table mushroom_collection
  add constraint mushroom_collection_target_check check (
    (venue_id is not null and connection_user_id is null and neighborhood_id is null) or
    (venue_id is null and connection_user_id is not null and neighborhood_id is null) or
    (venue_id is null and connection_user_id is null and neighborhood_id is not null)
  );

alter table mushroom_collection add constraint mushroom_collection_user_neighborhood_key unique (user_id, neighborhood_id);
