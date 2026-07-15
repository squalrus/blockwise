-- The "founder" badge (seeded in 20260707060000_founder_badge.sql) still
-- said "Blockwise" in its description (the app was renamed to Spored), and
-- "Founder" read as a generic, non-brand-specific badge name -- renamed to
-- "Early Sprout" to match the seedling icon's growth metaphor. The code
-- ('founder') is just an internal identifier and stays as-is.
update badge
set description = 'Joined Spored before its public launch.'
where code = 'founder'
  and description = 'Joined Blockwise before its public launch.';

update badge
set name = 'Early Sprout'
where code = 'founder'
  and name = 'Founder';
