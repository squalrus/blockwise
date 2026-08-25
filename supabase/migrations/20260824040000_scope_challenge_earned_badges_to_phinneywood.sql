-- User request: these 8 badges are earned only via a Phinneywood-scoped
-- challenge (challenge.badge_id, no badge_rule) -- the admin Badges tab
-- already classified them as "neighborhood_specific" by deriving it from
-- their challenge link (badgeAdmin.ts's resolveBadgeAdminItem), but the
-- badge row's own neighborhood_id stayed null, so the public Badge DTO
-- (GET /badges, GET /me/badges, etc.) had no way to show that scope --
-- e.g. "Welcome Neighbor" showed no neighborhood pill on the account Badges
-- tab even though it's genuinely Phinneywood-only. Setting neighborhood_id
-- directly makes it the single source of truth everywhere, admin and
-- public alike, matching how the Explorer badges are scoped.

update badge
set neighborhood_id = (select id from neighborhood where slug = 'phinneywood-seattle')
where code in (
  'coffee_crawler',       -- Coffee Crawl
  'neighborhood_explorer',-- Explore Woodland Park / Visit any POI
  'poi_completionist',    -- Visit every POI
  'bar_hopper',           -- Bar Hop
  'bakery_tourist',       -- Bakery Tour
  'retail_therapist',     -- Retail Therapy
  'phinneywood_foodie',   -- Taste of Phinneywood
  'phinneywood_welcome'   -- Thanks for Visiting Phinneywood
)
and exists (select 1 from neighborhood where slug = 'phinneywood-seattle');
