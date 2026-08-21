-- Business-admin Analytics tab (mirrors get_neighborhood_analytics,
-- 20260821010000_neighborhood_analytics_fn.sql): one combined RPC per venue
-- rather than 4 separate ones, since the single Analytics tab always
-- requests all 4 result sets together. locations_by_category_group/
-- top_venues don't have a venue-scoped equivalent (those are neighborhood-
-- collection concepts) -- checkins_by_day_of_week and coupon_claims_over_time
-- take their place, both actionable for a single business owner.
--
-- checkins_over_time / activity_by_type / checkins_by_day_of_week all read
-- point_event (see point_event_venue_id_idx below) rather than checkin,
-- mirroring the neighborhood RPC's reasoning for reading point_event over a
-- join through checkin.
create index point_event_venue_id_idx on point_event (venue_id) where venue_id is not null;

create or replace function get_venue_analytics(p_venue_id uuid, p_days int default 30)
returns json
language sql
stable
as $$
  select json_build_object(
    'venue_id', p_venue_id,
    'days', p_days,
    'checkins_over_time', (
      select coalesce(json_agg(row_to_json(t) order by t.date), '[]'::json)
      from (
        select date_trunc('day', created_at)::date as date, count(*) as count
        from point_event
        where venue_id = p_venue_id
          and event_type = 'checkin'
          and created_at >= now() - (p_days || ' days')::interval
        group by 1
      ) t
    ),
    'activity_by_type', (
      select coalesce(json_agg(row_to_json(t)), '[]'::json)
      from (
        select event_type, count(*) as count
        from point_event
        where venue_id = p_venue_id
          and event_type in ('checkin', 'favorite', 'challenge_completion')
          and created_at >= now() - (p_days || ' days')::interval
        group by 1
      ) t
    ),
    'checkins_by_day_of_week', (
      select coalesce(json_agg(row_to_json(t) order by t.day_of_week), '[]'::json)
      from (
        select extract(dow from created_at)::int as day_of_week, count(*) as count
        from point_event
        where venue_id = p_venue_id
          and event_type = 'checkin'
          and created_at >= now() - (p_days || ' days')::interval
        group by 1
      ) t
    ),
    'coupon_claims_over_time', (
      select coalesce(json_agg(row_to_json(t) order by t.date), '[]'::json)
      from (
        select date_trunc('day', cc.claimed_at)::date as date, count(*) as count
        from coupon_claim cc
        join coupon c on c.id = cc.coupon_id
        where c.venue_id = p_venue_id
          and cc.claimed_at >= now() - (p_days || ' days')::interval
        group by 1
      ) t
    )
  );
$$;
