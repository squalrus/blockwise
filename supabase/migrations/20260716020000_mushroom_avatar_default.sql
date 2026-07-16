-- Flips new-account default avatar style from social to mushroom
-- (20260711010000_avatar_style.sql originally shipped social-by-default).
-- Mushroom avatars are now the default choice, matching the Account
-- settings picker (ProfileForm.tsx) showing Mushroom first/left and Social
-- second/right. Only changes the column default for future inserts;
-- existing accounts keep whatever avatar_style they already have.
alter table app_user
  alter column avatar_style set default 'mushroom';
