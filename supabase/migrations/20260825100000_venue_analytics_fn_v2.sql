-- Adds event-follow analytics to get_venue_analytics: event_follows_over_time
-- (daily count, mirrors coupon_claims_over_time) and top_followed_events (per-
-- event breakdown, mirrors get_neighborhood_analytics' top_venues) -- a raw
-- daily count alone doesn't say *which* event is resonating, and a business
-- with only a handful of events cares more about that than the trend line.
-- Both join event_follow -> event on event.venue_id = p_venue_id (event_follow
-- itself has no venue_id -- 20260717180000_event_follows.sql).
create index event_follow_event_id_idx on event_follow (event_id);

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
    ),
    'event_follows_over_time', (
      select coalesce(json_agg(row_to_json(t) order by t.date), '[]'::json)
      from (
        select date_trunc('day', ef.created_at)::date as date, count(*) as count
        from event_follow ef
        join event e on e.id = ef.event_id
        where e.venue_id = p_venue_id
          and ef.created_at >= now() - (p_days || ' days')::interval
        group by 1
      ) t
    ),
    'top_followed_events', (
      select coalesce(json_agg(row_to_json(t)), '[]'::json)
      from (
        select e.id as event_id, e.title, count(*) as follow_count
        from event_follow ef
        join event e on e.id = ef.event_id
        where e.venue_id = p_venue_id
          and ef.created_at >= now() - (p_days || ' days')::interval
        group by e.id, e.title
        order by follow_count desc
        limit 10
      ) t
    )
  );
$$;
