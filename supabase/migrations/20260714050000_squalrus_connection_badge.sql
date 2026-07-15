-- Easter-egg badge (mirroring the one-off "founder" badge above rather than
-- the generic badge_rule engine, since this is keyed to one specific
-- username): awarded via awardSqualrusConnectionBadge
-- (apps/api/src/gamification/squalrusBadge.ts) to whichever side of a newly
-- accepted neighbor connection isn't @squalrus -- Spored's answer to Tom,
-- everyone's default first friend on Myspace.
insert into badge (code, name, description, icon)
select
  'squalrus_connection',
  'Everybody''s Neighbor',
  'Connected with @squalrus -- Spored''s answer to Tom, everyone''s first friend on Myspace.',
  'handshake'
where not exists (select 1 from badge where code = 'squalrus_connection');
