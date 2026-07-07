-- Neighborhood profile pages (BACKLOG.md): gives each neighborhood a public
-- profile mirroring the venue/business profile shape -- a description, plus
-- neighborhood-owned POIs and events that aren't tied to any single venue.
-- Reuses the existing venue-scoped poi/event tables (rather than duplicating
-- them) by making venue_id nullable and adding a neighborhood_id alternative,
-- with a check constraint enforcing exactly one owner per row.

alter table neighborhood add column description text;

alter table poi alter column venue_id drop not null;
alter table poi add column neighborhood_id uuid references neighborhood (id) on delete cascade;
alter table poi add constraint poi_owner_check check (
  (venue_id is not null and neighborhood_id is null) or
  (venue_id is null and neighborhood_id is not null)
);
create index poi_neighborhood_id_idx on poi (neighborhood_id);

alter table event alter column venue_id drop not null;
alter table event add column neighborhood_id uuid references neighborhood (id) on delete cascade;
alter table event add constraint event_owner_check check (
  (venue_id is not null and neighborhood_id is null) or
  (venue_id is null and neighborhood_id is not null)
);
create index event_neighborhood_id_idx on event (neighborhood_id);
