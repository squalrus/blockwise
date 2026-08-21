-- Neighborhood-admin Analytics tab: one combined RPC rather than 4 separate
-- ones -- all 4 result sets are always requested together by the single
-- Analytics tab (unlike get_neighborhood_list_counts / set_neighborhood_boundary,
-- which back genuinely separate call sites). Returns one json object built
-- from four sub-selects rather than `returns table` (which doesn't compose
-- for 4 differently-shaped arrays in one row anyway).
--
-- Check-ins-over-time / activity-by-type / top-venues all read point_event
-- (already neighborhood_id-scoped + indexed, point_event_neighborhood_id_idx)
-- rather than checkin, which has no neighborhood_id column and would need a
-- join through venue for every row. Locations-by-category-group reads
-- venue/category directly since it's location-count data, not activity.
create or replace function get_neighborhood_analytics(p_neighborhood_id uuid, p_days int default 30)
returns json
language sql
stable
as $$
  select json_build_object(
    'neighborhood_id', p_neighborhood_id,
    'days', p_days,
    'checkins_over_time', (
      select coalesce(json_agg(row_to_json(t) order by t.date), '[]'::json)
      from (
        select date_trunc('day', created_at)::date as date, count(*) as count
        from point_event
        where neighborhood_id = p_neighborhood_id
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
        where neighborhood_id = p_neighborhood_id
          and event_type in ('checkin', 'favorite', 'challenge_completion')
          and created_at >= now() - (p_days || ' days')::interval
        group by 1
      ) t
    ),
    'locations_by_category_group', (
      select coalesce(json_agg(row_to_json(t)), '[]'::json)
      from (
        select
          coalesce(parent.name, cat.name, 'Uncategorized') as category_group,
          v.kind,
          count(*) as count
        from venue v
        left join category cat on cat.id = v.category_id
        left join category parent on parent.id = cat.parent_category_id
        where v.neighborhood_id = p_neighborhood_id
          and v.status = 'active'
        group by 1, 2
      ) t
    ),
    'top_venues', (
      select coalesce(json_agg(row_to_json(t)), '[]'::json)
      from (
        select v.id as venue_id, v.name, count(*) as checkin_count
        from point_event pe
        join venue v on v.id = pe.venue_id
        where pe.neighborhood_id = p_neighborhood_id
          and pe.event_type = 'checkin'
          and pe.created_at >= now() - (p_days || ' days')::interval
        group by v.id, v.name
        order by checkin_count desc
        limit 10
      ) t
    )
  );
$$;
