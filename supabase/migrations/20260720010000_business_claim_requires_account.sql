-- Business claim requires existing account (BACKLOG.md Ref 32). Claim
-- submission now requires a signed-in account (see requireAuthUser on
-- POST /venues/:id/claims in app.ts), so every future claim always carries
-- claimed_by_user_id. The handful of pre-existing anonymous claims are all
-- test data from before this requirement, so they're dropped rather than
-- backfilled with a placeholder user.
delete from business_claim where claimed_by_user_id is null;

alter table business_claim alter column claimed_by_user_id set not null;
