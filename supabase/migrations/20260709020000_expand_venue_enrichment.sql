-- Expand venue_enrichment_cache to store the wider Google Places field mask
-- (hours, contact, multi-photo/review) -- BACKLOG.md Ref 41. Google Places
-- has no 24-hour deletion rule (project-plan.md §1.1) and this table remains
-- a TTL-refreshed cache (enrichment.ts's ENRICHMENT_TTL_MS), so dropping the
-- old single-value columns is safe: any row missing the new columns just
-- refreshes on its next stale read.
alter table venue_enrichment_cache
  drop column photo_url,
  drop column review_snippet,
  add column photo_refs jsonb not null default '[]'::jsonb,
  add column reviews jsonb not null default '[]'::jsonb,
  add column phone text,
  add column website text,
  add column hours jsonb,
  add column editorial_summary text,
  add column atmosphere jsonb;
