-- Real user authentication (BACKLOG.md). Wires Supabase Auth on top of the
-- anonymous-first app_user row (README §14.2) rather than forking the data
-- model: signup/login link an auth.users identity onto the *same* row so
-- prior anonymous check-in history is never migrated, just claimed.

-- auth_user_id is the join to Supabase's own auth.users table -- app_user.id
-- deliberately stays independent of it (it's assigned at first anonymous
-- check-in, before any auth.users row exists) rather than reusing it as the
-- primary key, which is the more common Supabase pattern but doesn't fit an
-- anonymous-first model.
alter table app_user
  add column auth_user_id uuid unique references auth.users (id) on delete set null;

-- README §14.2/§14.3 only describes a single consumer identity; this adds
-- the business-account variant needed to gate the business portal's
-- authoring tools (BACKLOG "Real user authentication" notes) once it exists.
alter table app_user
  add column account_type text not null default 'consumer' check (account_type in ('consumer', 'business'));

-- Lets a business account's claim auto-link to its own submitter once
-- authenticated, instead of only being resolvable via the (still separate,
-- unauthenticated) contact_name/contact_method/contact_value fields.
alter table business_claim
  add column claimed_by_user_id uuid references app_user (id) on delete set null;

create index business_claim_claimed_by_user_id_idx on business_claim (claimed_by_user_id);
