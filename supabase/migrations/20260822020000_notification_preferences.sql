-- BACKLOG.md Ref 102 follow-up: per-category push notification opt-outs,
-- surfaced on /account/settings. All-true default so an existing account's
-- behavior is unchanged until they explicitly opt out of a category.
alter table app_user
  add column notification_preferences jsonb not null default '{
    "checkins": true,
    "connection_requests": true,
    "connection_accepted": true,
    "event_reminders": true,
    "new_coupons": true
  }'::jsonb;
