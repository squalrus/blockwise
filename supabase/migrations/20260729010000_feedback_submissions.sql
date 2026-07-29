-- User-submitted bug reports/feature requests: a signed-in-only freeform
-- comment tied to the account, tracked through a triage lifecycle
-- (new -> in_progress -> done, or removed). No admin UI yet -- state is
-- moved via PATCH /admin/feedback/:id in the meantime.
create table feedback_submission (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_user (id) on delete cascade,
  type text not null check (type in ('bug', 'feature')),
  comment text not null,
  state text not null default 'new' check (state in ('new', 'in_progress', 'done', 'removed')),
  created_at timestamptz not null default now()
);

create index feedback_submission_user_id_idx on feedback_submission (user_id);
create index feedback_submission_state_idx on feedback_submission (state);

alter table feedback_submission enable row level security;
