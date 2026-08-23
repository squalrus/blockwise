-- BACKLOG.md Ref 102: tracks whether a follower has already received their
-- "event starting soon" push, so the reminder sweep (event-reminders.ts)
-- doesn't re-notify on every poll of the same event_follow row.
alter table event_follow add column notified_at timestamptz;
