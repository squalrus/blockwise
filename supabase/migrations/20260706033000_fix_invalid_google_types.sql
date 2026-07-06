-- "dry_cleaning" and "second_hand_store" aren't valid Google Places (New)
-- type strings -- Nearby Search rejected them outright as unsupported when
-- passed via includedTypes (see sync.ts). "laundry" and "thrift_store" are
-- the real types and already cover these categories.
update category
set source_mapping_json = '{"google": ["laundry"]}'::jsonb
where name = 'Laundry & Dry Cleaning';

update category
set source_mapping_json = '{"google": ["thrift_store"]}'::jsonb
where name = 'Thrift & Vintage';
