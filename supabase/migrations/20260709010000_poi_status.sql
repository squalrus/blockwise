-- POI management (BACKLOG.md Ref 29): brings POI up to parity with venue's
-- hide/restore (Ref 11) and timestamp columns, so an admin can hide a POI
-- without deleting it -- checkin/point_event/challenge all reference poi_id
-- with "on delete cascade", so a hard delete would silently wipe that
-- history rather than fail loudly; hide is the safe default and the API
-- layer additionally blocks hard delete outright when any such row exists.
alter table poi
  add column status text not null default 'active' check (status in ('active', 'hidden'));

create index poi_status_idx on poi (neighborhood_id, status);

alter table poi
  add column created_at timestamptz not null default now(),
  add column updated_at timestamptz not null default now();

create trigger poi_set_updated_at
  before update on poi
  for each row
  execute function set_updated_at();
