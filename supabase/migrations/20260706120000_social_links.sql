-- Instagram links and social media integration (BACKLOG.md Ref 30): lets a
-- claimed business and a neighborhood list outbound social media links
-- (Instagram, Twitter, TikTok, etc.) shown on their public profile pages.
-- Generic jsonb map rather than one column per platform, so adding a new
-- platform later is a UI/type change, not a migration. Mirrors the
-- category.source_mapping_json jsonb pattern already in the schema.

alter table business_claim add column social_links jsonb not null default '{}'::jsonb;
alter table neighborhood add column social_links jsonb not null default '{}'::jsonb;
