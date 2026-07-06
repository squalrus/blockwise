-- Google's "lodging" and "bed_and_breakfast" types cover any short-term
-- rental listing (Airbnb/VRBO-style), not just real hotels -- a live sync
-- run confirmed this in practice: 122 of 350 synced venues were vacation
-- rental listings, not neighborhood businesses. Restrict to "hotel" only,
-- matching the ~70-business neighborhood-storefront scope (README §12.4).
update category
set source_mapping_json = '{"google": ["hotel"]}'::jsonb
where name = 'Hotel & Lodging';
