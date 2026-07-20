-- Drops the "business domain" contact method (BACKLOG.md Ref 32 follow-up)
-- -- unlike phone/email, a bare domain doesn't help an admin actually reach
-- the claimant to verify ownership. Existing 'domain' rows are all test
-- data, so they're dropped rather than remapped to another method.
delete from business_claim where contact_method = 'domain';

alter table business_claim drop constraint business_claim_contact_method_check;
alter table business_claim add constraint business_claim_contact_method_check
  check (contact_method in ('phone', 'email'));
