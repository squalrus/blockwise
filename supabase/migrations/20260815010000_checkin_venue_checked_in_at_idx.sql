-- BACKLOG.md Ref 94 "Mushroom size reflects recent check-in activity": the
-- neighborhood/location card mosaics now query checkin rows within a rolling
-- 60-day window, scoped by venue_id (venue-scoped query) or via venue's
-- neighborhood_id (neighborhood-scoped query, which still benefits from this
-- index plus venue's own primary key). Existing checkin indexes are all
-- user_id-first (checkin_user_venue_checked_in_at_idx,
-- checkin_user_checked_in_at_idx) -- neither serves a venue-scoped,
-- date-windowed query well.
create index checkin_venue_checked_in_at_idx on checkin (venue_id, checked_in_at desc);
