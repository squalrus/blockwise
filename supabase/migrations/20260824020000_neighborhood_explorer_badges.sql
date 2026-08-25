-- BACKLOG.md Ref 108 follow-up: the 7 category_milestone "Explorer" badge
-- families (Coffee Shop/Restaurant/Bar/Bakery/Ice Cream & Dessert/Brewery/
-- Winery, x3 tiers each -- 20260710050000_badge_rule_engine.sql) were seeded
-- as global, but they're conceptually about *one neighborhood's own*
-- businesses in that category, not a lifetime cross-neighborhood tally, and
-- each neighborhood is meant to get its own copy as it onboards (a future
-- copy-on-onboard mechanism, not yet built -- this migration re-homes the
-- one existing set to Phinneywood as the starting point, per BACKLOG.md).

alter table badge add column neighborhood_id uuid references neighborhood (id) on delete cascade;
create index badge_neighborhood_id_idx on badge (neighborhood_id) where neighborhood_id is not null;

do $$
declare
  v_neighborhood_id uuid;
begin
  select id into v_neighborhood_id from neighborhood where slug = 'phinneywood-seattle';
  if v_neighborhood_id is null then
    return;
  end if;

  -- Drop a tier Phinneywood doesn't actually have enough active venues to
  -- complete (e.g. no 10-venue tier for a category with only 6 active
  -- venues) -- but only when nobody has earned it yet; an already-earned
  -- badge is historical and stays regardless of today's venue count.
  -- Deleting the badge cascades to its badge_rule (badge_rule.badge_id is
  -- "references badge (id) on delete cascade").
  with explorer_badges as (
    select b.id as badge_id, r.threshold, r.category_id
    from (values
      ('coffee_explorer'), ('restaurant_explorer'), ('bar_explorer'), ('bakery_explorer'),
      ('dessert_explorer'), ('brewery_explorer'), ('winery_explorer')
    ) as f(code_prefix)
    cross join (values (1), (5), (10)) as t(tier_count)
    join badge b on b.code = f.code_prefix || '_' || t.tier_count
    join badge_rule r on r.badge_id = b.id
  )
  delete from badge
  where id in (
    select eb.badge_id
    from explorer_badges eb
    where not exists (select 1 from user_badge ub where ub.badge_id = eb.badge_id)
      and eb.threshold > (
        select count(*) from venue v
        where v.neighborhood_id = v_neighborhood_id
          and v.category_id = eb.category_id
          and v.status = 'active'
      )
  );

  -- Re-home whatever's left (the reachable tiers, plus any
  -- already-earned-but-now-unreachable ones, kept for history) to
  -- Phinneywood.
  update badge
  set neighborhood_id = v_neighborhood_id
  where code in (
    select f.code_prefix || '_' || t.tier_count
    from (values
      ('coffee_explorer'), ('restaurant_explorer'), ('bar_explorer'), ('bakery_explorer'),
      ('dessert_explorer'), ('brewery_explorer'), ('winery_explorer')
    ) as f(code_prefix)
    cross join (values (1), (5), (10)) as t(tier_count)
  );
end $$;
