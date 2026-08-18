-- Missing-venue reports (BACKLOG.md Ref 80/96): a third feedback type routed
-- to a neighborhood's own admins rather than super admins (see feedback.ts's
-- submitFeedback and the new /neighborhood-admin/neighborhoods/:id/feedback
-- routes), so it needs a neighborhood_id and a free-text venue_name that
-- bug/feature submissions never use. Both nullable at the DB layer -- the
-- app layer (feedback.ts) enforces they're present for "missing_venue" and
-- absent otherwise, same division of labor as the existing type/state check
-- constraints (valid values enforced here, cross-field rules enforced in
-- code).
alter table feedback_submission
  add column neighborhood_id uuid references neighborhood (id) on delete cascade,
  add column venue_name text;

alter table feedback_submission drop constraint feedback_submission_type_check;
alter table feedback_submission add constraint feedback_submission_type_check
  check (type in ('bug', 'feature', 'missing_venue'));

create index feedback_submission_neighborhood_id_idx on feedback_submission (neighborhood_id);
