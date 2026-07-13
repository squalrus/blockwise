-- BACKLOG.md Ref 14/33 "Connect with other users" -- 5pts to each side of a
-- newly-accepted neighbor connection (mirrors FAVORITE_POINTS's first-time-
-- only semantics), plus a tier of "neighbor count" badges. Unlike
-- checkin/favorite/challenge_completion, a neighbor connection has no
-- neighborhood, so neighborhood_id has to become nullable rather than
-- derived from a venue.

alter table point_event alter column neighborhood_id drop not null;

alter table point_event drop constraint point_event_event_type_check;
alter table point_event add constraint point_event_event_type_check
  check (event_type in ('checkin', 'favorite', 'challenge_completion', 'neighbor_connection'));

-- The other party in a neighbor-connection point award -- lets the
-- uniqueness guard below key on (user, other user) rather than a specific
-- user_connection row, so removing and re-adding the same neighbor doesn't
-- re-earn the 5pts.
alter table point_event add column neighbor_user_id uuid references app_user (id) on delete cascade;

create unique index point_event_neighbor_connection_idx on point_event (user_id, neighbor_user_id)
  where event_type = 'neighbor_connection';

alter table badge_rule drop constraint badge_rule_rule_type_check;
alter table badge_rule add constraint badge_rule_rule_type_check
  check (rule_type in (
    'category_milestone',
    'poi_milestone',
    'daily_distinct_venues',
    'same_venue_repeat_in_day',
    'level_reached',
    'neighbor_count_reached'   -- N accepted neighbor connections
  ));

-- Neighbor-count badges: 1, then 5 through 50 in steps of 5, mirroring the
-- day_tripper tiers above.
insert into badge (code, name, description, icon)
select
  'good_neighbor_' || t.tier_count,
  t.tier_count || (case when t.tier_count = 1 then ' Neighbor' else ' Neighbors' end),
  'Connected with ' || t.tier_count || ' neighbor' || (case when t.tier_count = 1 then '' else 's' end) || '.',
  'handshake'
from (values (1), (5), (10), (15), (20), (25), (30), (35), (40), (45), (50)) as t(tier_count)
where not exists (select 1 from badge where code = 'good_neighbor_' || t.tier_count);

insert into badge_rule (badge_id, rule_type, threshold)
select b.id, 'neighbor_count_reached', t.tier_count
from (values (1), (5), (10), (15), (20), (25), (30), (35), (40), (45), (50)) as t(tier_count)
join badge b on b.code = 'good_neighbor_' || t.tier_count
where not exists (select 1 from badge_rule where badge_id = b.id);
