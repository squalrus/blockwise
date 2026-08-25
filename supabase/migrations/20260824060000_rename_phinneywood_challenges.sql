-- User request: put "Phinneywood" in the title of every Phinneywood
-- challenge, matching 20260824050000's badge renames. "Taste of
-- Phinneywood" and "Thanks for Visiting Phinneywood" already say it;
-- descriptions are untouched here (already clean of Summer Series/July
-- wording as of 20260824050000, except these titles never carried it to
-- begin with).

update challenge set title = 'Phinneywood Coffee Crawl' where title = 'Coffee Crawl';
update challenge set title = 'Visit Any Phinneywood POI' where title = 'Visit any POI';
update challenge set title = 'Visit Every Phinneywood POI' where title = 'Visit every POI';
update challenge set title = 'Phinneywood Bar Hop' where title = 'Bar Hop';
update challenge set title = 'Phinneywood Bakery Tour' where title = 'Bakery Tour';
update challenge set title = 'Phinneywood Retail Therapy' where title = 'Retail Therapy';
