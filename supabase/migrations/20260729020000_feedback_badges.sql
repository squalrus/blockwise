-- One-off badges (mirroring event_scout's seed-then-direct-award pattern,
-- not the generic badge_rule engine): "Feedback Giver" on a user's
-- first-ever feedback submission (apps/api/src/gamification/feedbackBadges.ts,
-- called from POST /me/feedback), "Contributor" when one of their
-- submissions is marked done (same file, called from
-- PATCH /admin/feedback/:id).
insert into badge (code, name, description, icon)
select 'feedback_giver', 'Feedback Giver', 'Submitted your first bug report or feature request.', 'megaphone'
where not exists (select 1 from badge where code = 'feedback_giver');

insert into badge (code, name, description, icon)
select 'contributor', 'Contributor', 'Had a submitted bug report or feature request implemented.', 'wrench'
where not exists (select 1 from badge where code = 'contributor');
