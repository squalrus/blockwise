-- One-off badge (mirroring founder/squalrus_connection's seed-then-direct-
-- award pattern, not the generic badge_rule engine) for a user's first-ever
-- event follow (BACKLOG.md Ref 81): awarded via awardEventFollowBadge
-- (apps/api/src/gamification/eventFollowBadge.ts), called on every
-- successful POST /events/:id/follow -- awardBadgeByCode's unique-violation
-- swallow means it only ever actually lands on the first one.
insert into badge (code, name, description, icon)
select 'event_scout', 'Event Scout', 'Followed your first event.', 'calendar'
where not exists (select 1 from badge where code = 'event_scout');
