-- BACKLOG.md Ref 86: removes the anonymous-account concept entirely.
-- Unauthenticated visitors can still browse everything; every interactive
-- action (check-in, favorite) now requires a real signed-in account.
--
-- Anonymous app_user rows never had a real identity behind them -- deleting
-- them cascades (on delete cascade) to their checkin/favorite/point_event/
-- user_badge/user_challenge_completion rows, which is correct: that history
-- was never attached to anyone who could come back and claim it.
delete from app_user where is_anonymous = true;

-- The device-merge-on-login mechanism (README/project-plan.md §14.2) only
-- existed to fold an anonymous device's history into the account being
-- logged into. With no more anonymous accounts, there's nothing to merge.
drop function if exists merge_anonymous_user_history(uuid, uuid, text);

alter table app_user drop column is_anonymous;
alter table app_user drop column anonymous_device_id;
