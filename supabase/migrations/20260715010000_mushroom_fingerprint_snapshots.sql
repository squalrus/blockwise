-- BACKLOG.md "Mushroom fingerprint stamps on connections and check-ins":
-- freeze what a user's mushroom looked like at the moment of a check-in or
-- accepted connection, so a later customizer edit (or auto-assigned look
-- shifting after a palette/shape change) doesn't silently repaint history.
-- Nullable, not backfilled -- existing rows predate this feature and simply
-- have no snapshot (renderers fall back to a live-computed look for those).
-- Shape (packages/types/src/mushroom.ts's MushroomSnapshot): { v, cap,
-- stalk, spots, spotCount, spotShape, bg }.
alter table checkin add column mushroom_snapshot jsonb;

-- One column per side -- captured at accept time (not request time), from
-- each party's mushroom_customization (or their hash-derived default) as it
-- stood at that moment.
alter table user_connection add column requester_mushroom_snapshot jsonb;
alter table user_connection add column recipient_mushroom_snapshot jsonb;
