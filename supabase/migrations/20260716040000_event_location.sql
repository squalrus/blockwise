-- iCal/webcal event feed import (BACKLOG.md Ref 30): a feed's VEVENT can
-- carry a free-text LOCATION, which matters for neighborhood-level feeds
-- especially -- a neighborhood-wide calendar's events can be anywhere in the
-- neighborhood, unlike a single business's own events, which are always at
-- that business's own address. icalSync.ts auto-fills location from the
-- venue's own address for venue-owned imports (falling back to whatever the
-- feed says only if the venue has no address on file), and passes the
-- feed's own per-event location through unchanged for neighborhood-owned
-- imports. Manually-created events (EventForm) don't collect a location yet
-- and stay null.

alter table event add column location text;
