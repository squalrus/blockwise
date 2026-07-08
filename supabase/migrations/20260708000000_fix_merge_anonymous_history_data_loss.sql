-- Fixes a data-loss bug in the anonymous-device-to-account login merge
-- (apps/api/src/auth/supabaseRepository.ts mergeAnonymousHistory): it
-- reassigned checkin.user_id onto the authenticated account but then
-- deleted the anonymous app_user row outright. point_event, favorite,
-- user_badge, and user_challenge_completion all reference app_user with
-- "on delete cascade", so that delete silently wiped every point/badge the
-- anonymous device had earned -- including for the check-ins that had just
-- been reassigned onto the account a moment earlier.
--
-- This function moves those rows onto the target account first (skipping
-- any row that would collide with something the target already has, e.g.
-- its own favorite-bonus for the same venue, respecting the same unique
-- constraints the live award path enforces) and only deletes the
-- now-empty anonymous row afterward, all in one transaction.
create or replace function merge_anonymous_user_history(
  p_target_user_id uuid,
  p_anonymous_user_id uuid,
  p_device_id text
) returns void
language plpgsql
as $$
begin
  update checkin set user_id = p_target_user_id where user_id = p_anonymous_user_id;

  update point_event set user_id = p_target_user_id
  where user_id = p_anonymous_user_id
    and (
      event_type != 'favorite'
      or not exists (
        select 1 from point_event existing
        where existing.user_id = p_target_user_id
          and existing.event_type = 'favorite'
          and existing.venue_id = point_event.venue_id
      )
    );
  delete from point_event where user_id = p_anonymous_user_id;

  update favorite set user_id = p_target_user_id
  where user_id = p_anonymous_user_id
    and not exists (
      select 1 from favorite existing
      where existing.user_id = p_target_user_id and existing.venue_id = favorite.venue_id
    );
  delete from favorite where user_id = p_anonymous_user_id;

  update user_badge set user_id = p_target_user_id
  where user_id = p_anonymous_user_id
    and not exists (
      select 1 from user_badge existing
      where existing.user_id = p_target_user_id and existing.badge_id = user_badge.badge_id
    );
  delete from user_badge where user_id = p_anonymous_user_id;

  update user_challenge_completion set user_id = p_target_user_id
  where user_id = p_anonymous_user_id
    and not exists (
      select 1 from user_challenge_completion existing
      where existing.user_id = p_target_user_id and existing.challenge_id = user_challenge_completion.challenge_id
    );
  delete from user_challenge_completion where user_id = p_anonymous_user_id;

  delete from app_user where id = p_anonymous_user_id;

  update app_user set anonymous_device_id = p_device_id where id = p_target_user_id;
end;
$$;
