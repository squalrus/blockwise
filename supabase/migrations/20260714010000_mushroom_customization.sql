-- Mushroom avatar customizer (BACKLOG.md Ref 75): lets a user override the
-- hash-derived cap/stalk/pattern from mushroomConfigForUser (packages/ui)
-- with a deliberate choice. Null means "no customization saved yet" --
-- rendering falls back to the seed-derived default, same as every account
-- did before this migration. Only ever written through PATCH /me/profile,
-- which validates the shape against an enum of approved cap/stalk/pattern
-- values (packages/ui's brand palette) so arbitrary hex/pattern names can't
-- be stored.
alter table app_user
  add column mushroom_customization jsonb;
