-- All-neighborhoods browse list (BACKLOG.md "Neighborhoods on landing page
-- and user profile" follow-up: business/member counts on each card) needs a
-- per-neighborhood business count and member count for every row in one
-- request. countActiveVenuesForNeighborhood/countMembersForNeighborhood
-- (venues/supabaseDetailRepository.ts, neighborhoodMembers/supabaseRepository.ts)
-- already do this one neighborhood at a time for the single-neighborhood
-- profile page; running either 154-times-over for the full list would be an
-- N+1 storm, so this aggregates both counts, grouped by neighborhood, in a
-- single query -- mirroring the RPC pattern in
-- 20260708010000_neighborhood_boundary_admin_fns.sql.
create or replace function get_neighborhood_list_counts()
returns table (
  neighborhood_id uuid,
  business_count bigint,
  member_count bigint
)
language sql
stable
as $$
  select
    n.id as neighborhood_id,
    coalesce(v.cnt, 0) as business_count,
    coalesce(m.cnt, 0) as member_count
  from neighborhood n
  left join (
    select neighborhood_id, count(*) as cnt
    from venue
    where status = 'active'
    group by neighborhood_id
  ) v on v.neighborhood_id = n.id
  left join (
    select neighborhood_id, count(*) as cnt
    from neighborhood_member
    group by neighborhood_id
  ) m on m.neighborhood_id = n.id;
$$;
