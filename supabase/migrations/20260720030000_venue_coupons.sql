-- Venue coupons replace announcements (BACKLOG.md Ref 83, superseding the
-- "attach coupon to Announcement" shape from Ref 20 and fully retiring Ref
-- 5's `announcement` table -- neighborhoods keep their own separate
-- announcements concept, BACKLOG.md Ref 9, not yet built). A coupon is a
-- limited-quantity, date-ranged offer a claimed business posts; a user
-- unlocks one of the N copies by checking in at the venue (or already having
-- checked in within the existing 4-hour cooldown window --
-- apps/api/src/checkins/checkin.ts's CHECKIN_COOLDOWN_MS), then redeems it
-- in person via a slide-to-redeem gesture witnessed by staff (mirroring
-- SlideToCheckIn's slide-to-check-in pattern).

drop table if exists announcement;

create table coupon (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references venue (id) on delete cascade,
  title text not null,
  description text not null,
  terms text,
  quantity integer not null check (quantity > 0),
  quantity_remaining integer not null check (quantity_remaining >= 0),
  start_at timestamptz not null,
  end_at timestamptz not null check (end_at > start_at),
  created_at timestamptz not null default now()
);

create index coupon_venue_id_start_at_idx on coupon (venue_id, start_at desc);

alter table coupon enable row level security;

-- One row per user who has claimed a copy of a coupon. quantity_remaining is
-- decremented at claim time, not redeem time -- claiming reserves a unit,
-- redeeming (in person, slide-to-redeem) just marks that reserved unit
-- used. redeemed_at stays null until then; once set it's permanent -- the
-- venue page shows the stored timestamp instead of the slide control on any
-- later visit (BACKLOG.md Ref 83's "if reopened after redemption" note).
create table coupon_claim (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references coupon (id) on delete cascade,
  user_id uuid not null references app_user (id) on delete cascade,
  claimed_at timestamptz not null default now(),
  redeemed_at timestamptz,
  unique (coupon_id, user_id)
);

create index coupon_claim_user_id_idx on coupon_claim (user_id);

alter table coupon_claim enable row level security;

-- Atomic claim: reserves one unit of quantity_remaining and inserts the
-- claim row in a single statement (BACKLOG.md Ref 83's "atomic
-- check-and-increment"). Distinguishes three outcomes via the `result`
-- column rather than raising, since "already claimed" and "sold out" are
-- expected, routine outcomes for the API layer to translate into a 200/409,
-- not error conditions: 'already_claimed' (idempotent -- returns the
-- existing claim), 'unavailable' (sold out, not yet started, or expired --
-- checked here as well as by the caller so a direct RPC call is still
-- safe), 'claimed' (a fresh reservation). The nested BEGIN/EXCEPTION block
-- around the insert establishes a savepoint, so a unique_violation racing
-- against a concurrent claim by the same user rolls back just the quantity
-- decrement before falling back to the existing-claim read.
create or replace function claim_coupon(p_coupon_id uuid, p_user_id uuid)
returns table (
  claim_id uuid,
  claimed_at timestamptz,
  redeemed_at timestamptz,
  result text
)
language plpgsql
as $$
declare
  v_now timestamptz := now();
  v_claim_id uuid;
  v_claimed_at timestamptz;
  v_redeemed_at timestamptz;
begin
  select cc.id, cc.claimed_at, cc.redeemed_at into v_claim_id, v_claimed_at, v_redeemed_at
  from coupon_claim cc
  where cc.coupon_id = p_coupon_id and cc.user_id = p_user_id;

  if found then
    return query select v_claim_id, v_claimed_at, v_redeemed_at, 'already_claimed'::text;
    return;
  end if;

  update coupon
  set quantity_remaining = quantity_remaining - 1
  where id = p_coupon_id
    and quantity_remaining > 0
    and v_now between start_at and end_at;

  if not found then
    return query select null::uuid, null::timestamptz, null::timestamptz, 'unavailable'::text;
    return;
  end if;

  begin
    insert into coupon_claim as cc (coupon_id, user_id, claimed_at)
    values (p_coupon_id, p_user_id, v_now)
    returning cc.id, cc.claimed_at, cc.redeemed_at into v_claim_id, v_claimed_at, v_redeemed_at;
  exception when unique_violation then
    update coupon set quantity_remaining = quantity_remaining + 1 where id = p_coupon_id;
    select cc.id, cc.claimed_at, cc.redeemed_at into v_claim_id, v_claimed_at, v_redeemed_at
    from coupon_claim cc where cc.coupon_id = p_coupon_id and cc.user_id = p_user_id;
    return query select v_claim_id, v_claimed_at, v_redeemed_at, 'already_claimed'::text;
    return;
  end;

  return query select v_claim_id, v_claimed_at, v_redeemed_at, 'claimed'::text;
end;
$$;
