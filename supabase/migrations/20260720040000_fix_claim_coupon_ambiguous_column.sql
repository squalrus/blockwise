-- Repairs claim_coupon() from 20260720030000_venue_coupons.sql: its
-- `returns table (claim_id, claimed_at, redeemed_at, result)` clause
-- implicitly declares claimed_at/redeemed_at as PL/pgSQL variables in scope
-- for the whole function body, which collided with coupon_claim's own
-- columns of the same name in the INSERT ... RETURNING clause ("column
-- reference \"claimed_at\" is ambiguous"). Fixed by aliasing the insert
-- target and qualifying the RETURNING list against that alias -- the two
-- SELECT ... INTO statements elsewhere in the function were already
-- qualified via the `cc` alias and unaffected.

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
