-- Level-reached ("N Forager") badges were seeded with icon='star'; switch them
-- to the mushroom emoji to match the rest of the product's forager theming.
update badge
set icon = 'mushroom'
where code like 'level\_%' escape '\'
  and icon = 'star';
