-- The "founder" badge (seeded in 20260707060000_founder_badge.sql) shared the
-- generic 'star' icon with everything else; give it a distinct seedling
-- emoji now that level badges use the mushroom (20260714020000).
update badge
set icon = 'seedling'
where code = 'founder'
  and icon = 'star';
