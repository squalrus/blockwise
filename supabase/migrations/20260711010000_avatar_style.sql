-- Mushroom avatars (BACKLOG.md): avatar_url is seeded once from the OAuth
-- provider's photo at signup (README §14.2/§14.3) and was previously also
-- client-editable via PATCH /me/profile -- a free-text URL field, letting a
-- user point their avatar at any image on the web (an explicit-content
-- risk). avatar_style replaces that: the only user-editable avatar choice
-- is now between the social photo already on file and the account's
-- randomly-assigned mushroom (packages/ui's mushroomConfigForUser, derived
-- from app_user.id -- no image upload or URL involved for that option
-- either). Defaults to 'social' so existing accounts keep showing whatever
-- photo they already had.
alter table app_user
  add column avatar_style text not null default 'social' check (avatar_style in ('social', 'mushroom'));
