-- Unified category taxonomy (README §2): ~30-50 categories sitting on top of
-- Google's `types[]`. Each leaf category's source_mapping_json.google lists
-- the Google Places "type" strings that normalize into it -- the sync's
-- category-matching step (BACKLOG "Data layer MVP") looks up a venue's
-- Google types against this list. Parent rows are purely organizational
-- (empty source_mapping_json) and aren't matched against directly.

insert into category (name, parent_category_id, source_mapping_json)
values
  ('Food & Drink', null, '{}'::jsonb),
  ('Retail', null, '{}'::jsonb),
  ('Health & Wellness', null, '{}'::jsonb),
  ('Services', null, '{}'::jsonb),
  ('Arts, Culture & Recreation', null, '{}'::jsonb),
  ('Lodging', null, '{}'::jsonb);

insert into category (name, parent_category_id, source_mapping_json)
values
  -- Food & Drink
  ('Coffee Shop', (select id from category where name = 'Food & Drink'),
    '{"google": ["cafe", "coffee_shop"]}'::jsonb),
  ('Restaurant', (select id from category where name = 'Food & Drink'),
    '{"google": ["restaurant"]}'::jsonb),
  ('Fast Food', (select id from category where name = 'Food & Drink'),
    '{"google": ["fast_food_restaurant", "meal_takeaway"]}'::jsonb),
  ('Bar', (select id from category where name = 'Food & Drink'),
    '{"google": ["bar", "night_club"]}'::jsonb),
  ('Bakery', (select id from category where name = 'Food & Drink'),
    '{"google": ["bakery"]}'::jsonb),
  ('Ice Cream & Dessert', (select id from category where name = 'Food & Drink'),
    '{"google": ["ice_cream_shop", "dessert_shop"]}'::jsonb),
  ('Brewery', (select id from category where name = 'Food & Drink'),
    '{"google": ["brewery"]}'::jsonb),
  ('Winery', (select id from category where name = 'Food & Drink'),
    '{"google": ["winery"]}'::jsonb),
  ('Grocery Store', (select id from category where name = 'Food & Drink'),
    '{"google": ["grocery_store", "supermarket"]}'::jsonb),
  ('Specialty Food', (select id from category where name = 'Food & Drink'),
    '{"google": ["food_store", "butcher_shop"]}'::jsonb),
  ('Convenience Store', (select id from category where name = 'Food & Drink'),
    '{"google": ["convenience_store"]}'::jsonb),

  -- Retail
  ('Clothing & Apparel', (select id from category where name = 'Retail'),
    '{"google": ["clothing_store", "shoe_store"]}'::jsonb),
  ('Bookstore', (select id from category where name = 'Retail'),
    '{"google": ["book_store"]}'::jsonb),
  ('Gift & Specialty Shop', (select id from category where name = 'Retail'),
    '{"google": ["gift_shop"]}'::jsonb),
  ('Home & Garden', (select id from category where name = 'Retail'),
    '{"google": ["home_goods_store", "hardware_store", "furniture_store"]}'::jsonb),
  ('Electronics', (select id from category where name = 'Retail'),
    '{"google": ["electronics_store"]}'::jsonb),
  ('Pet Supplies', (select id from category where name = 'Retail'),
    '{"google": ["pet_store"]}'::jsonb),
  ('Florist', (select id from category where name = 'Retail'),
    '{"google": ["florist"]}'::jsonb),
  ('Jewelry', (select id from category where name = 'Retail'),
    '{"google": ["jewelry_store"]}'::jsonb),
  ('Thrift & Vintage', (select id from category where name = 'Retail'),
    '{"google": ["thrift_store", "second_hand_store"]}'::jsonb),
  ('Liquor Store', (select id from category where name = 'Retail'),
    '{"google": ["liquor_store"]}'::jsonb),

  -- Health & Wellness
  ('Gym & Fitness', (select id from category where name = 'Health & Wellness'),
    '{"google": ["gym", "fitness_center"]}'::jsonb),
  ('Yoga Studio', (select id from category where name = 'Health & Wellness'),
    '{"google": ["yoga_studio"]}'::jsonb),
  ('Salon & Barber', (select id from category where name = 'Health & Wellness'),
    '{"google": ["hair_salon", "hair_care", "barber_shop"]}'::jsonb),
  ('Spa', (select id from category where name = 'Health & Wellness'),
    '{"google": ["spa"]}'::jsonb),
  ('Pharmacy', (select id from category where name = 'Health & Wellness'),
    '{"google": ["pharmacy", "drugstore"]}'::jsonb),
  ('Medical & Dental', (select id from category where name = 'Health & Wellness'),
    '{"google": ["doctor", "dentist", "medical_lab"]}'::jsonb),
  ('Veterinary', (select id from category where name = 'Health & Wellness'),
    '{"google": ["veterinary_care"]}'::jsonb),

  -- Services
  ('Bank & ATM', (select id from category where name = 'Services'),
    '{"google": ["bank", "atm"]}'::jsonb),
  ('Laundry & Dry Cleaning', (select id from category where name = 'Services'),
    '{"google": ["laundry", "dry_cleaning"]}'::jsonb),
  ('Auto Repair & Wash', (select id from category where name = 'Services'),
    '{"google": ["car_repair", "car_wash"]}'::jsonb),
  ('Post Office & Shipping', (select id from category where name = 'Services'),
    '{"google": ["post_office"]}'::jsonb),
  ('Real Estate', (select id from category where name = 'Services'),
    '{"google": ["real_estate_agency"]}'::jsonb),
  ('Insurance', (select id from category where name = 'Services'),
    '{"google": ["insurance_agency"]}'::jsonb),
  ('Legal Services', (select id from category where name = 'Services'),
    '{"google": ["lawyer"]}'::jsonb),
  ('Accounting & Tax', (select id from category where name = 'Services'),
    '{"google": ["accounting"]}'::jsonb),

  -- Arts, Culture & Recreation
  ('Movie Theater', (select id from category where name = 'Arts, Culture & Recreation'),
    '{"google": ["movie_theater"]}'::jsonb),
  ('Performing Arts', (select id from category where name = 'Arts, Culture & Recreation'),
    '{"google": ["performing_arts_theater"]}'::jsonb),
  ('Art Gallery', (select id from category where name = 'Arts, Culture & Recreation'),
    '{"google": ["art_gallery"]}'::jsonb),
  ('Museum', (select id from category where name = 'Arts, Culture & Recreation'),
    '{"google": ["museum"]}'::jsonb),
  ('Park & Playground', (select id from category where name = 'Arts, Culture & Recreation'),
    '{"google": ["park", "playground"]}'::jsonb),
  ('Library', (select id from category where name = 'Arts, Culture & Recreation'),
    '{"google": ["library"]}'::jsonb),
  ('Community Center', (select id from category where name = 'Arts, Culture & Recreation'),
    '{"google": ["community_center"]}'::jsonb),

  -- Lodging
  ('Hotel & Lodging', (select id from category where name = 'Lodging'),
    '{"google": ["hotel", "lodging", "bed_and_breakfast"]}'::jsonb);
