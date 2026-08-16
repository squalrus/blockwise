-- BACKLOG.md Ref 94/97 (mushroom revamp, v0.60.0): both consumers of the
-- frozen-at-the-moment mushroom_snapshot mechanic (BACKLOG.md "Mushroom
-- fingerprint stamps on connections and check-ins", added in
-- 20260715010000_mushroom_fingerprint_snapshots.sql) switched to always-live
-- resolution (resolveMushroomConfig) -- the neighborhood/location card
-- mosaics (Ref 94) and the profile card's neighbor mosaic (Ref 97). Nothing
-- reads these columns anymore, so drop them rather than leaving dead
-- write-only storage behind.
alter table checkin drop column mushroom_snapshot;
alter table user_connection drop column requester_mushroom_snapshot;
alter table user_connection drop column recipient_mushroom_snapshot;
