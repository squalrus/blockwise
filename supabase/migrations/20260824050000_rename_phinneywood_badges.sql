-- User request: put "Phinneywood" in the title of every Phinneywood-scoped
-- badge (the 8 given neighborhood_id by 20260824040000), and drop the
-- "during the Summer Series"/"during July" wording from their descriptions
-- -- both are stale copy left over from when these were seasonal Summer
-- Series rewards (the challenges themselves were made evergreen back in
-- 20260710040000's "Summer Series" pass; the copy never caught up).

update badge set name = 'Phinneywood Coffee Crawler',
  description = 'Checked in to 5 different coffee shops in Phinneywood.'
where code = 'coffee_crawler';

update badge set name = 'Phinneywood Explorer'
where code = 'neighborhood_explorer';

update badge set name = 'Phinneywood Completionist'
where code = 'poi_completionist';

update badge set name = 'Phinneywood Bar Hopper',
  description = 'Checked in to 3 different bars in Phinneywood.'
where code = 'bar_hopper';

update badge set name = 'Phinneywood Bakery Tourist',
  description = 'Checked in to 3 different bakeries in Phinneywood.'
where code = 'bakery_tourist';

update badge set name = 'Phinneywood Retail Therapist',
  description = 'Checked in to 5 different gift & specialty shops in Phinneywood.'
where code = 'retail_therapist';

update badge set
  description = 'Checked in to 3 different restaurants in Phinneywood.'
where code = 'phinneywood_foodie'; -- name already Phinneywood-specific

update badge set name = 'Welcome to Phinneywood'
where code = 'phinneywood_welcome';

-- The one challenge description that still says "during July" (the rest of
-- the Summer Series challenges' own descriptions were already clean --
-- only their badges had the stale wording).
update challenge set description = 'Check in to 5 different coffee shops in Phinneywood.'
where title = 'Coffee Crawl';
