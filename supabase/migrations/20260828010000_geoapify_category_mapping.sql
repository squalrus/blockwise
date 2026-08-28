-- Geoapify migration Phase 2 (docs/geoapify-migration-plan.md): replace
-- every leaf category's source_mapping_json.google with .geoapify, mapped
-- from Geoapify's OSM-derived category taxonomy
-- (https://apidocs.geoapify.com/docs/places/#categories). Full replace, not
-- add-alongside, per the plan's design decision -- this repo has only one
-- neighborhood seeded and no cron sync, so there's no in-flight sync run to
-- protect. Accepted consequence: until Phase 4 rewires sync.ts/investigate.ts
-- onto the real Geoapify client, categorize.ts can no longer match Google's
-- flat type strings, so every place goes uncategorized and the Nearby Search
-- included-types restriction is dropped (search runs unrestricted per tile)
-- -- both call sites are updated in this same change to fail soft rather
-- than send malformed requests to Google.
--
-- Geoapify's categories are dot-hierarchical (e.g.
-- "catering.restaurant.italian"), unlike Google's flat type strings, and the
-- live-verified categories field returns just the matched leaf tag per place
-- (docs/location-services-comparison.md#live-verification, mockGeoapifyClient.ts
-- fixtures) -- categorize.ts's new matcher does prefix matching (a place
-- tagged "catering.restaurant.italian" matches a category configured with
-- "catering.restaurant"), so most mappings below use one broad parent tag
-- rather than enumerating every subtype.
--
-- Known coverage gap: Geoapify/OSM has no distinct yoga-studio tag (OSM
-- typically tags these the same as a fitness centre) -- Yoga Studio is left
-- unmapped (empty geoapify list) rather than colliding with Gym & Fitness's
-- "sport.fitness", so it flags for manual review instead of guessing.

update category set source_mapping_json = '{"geoapify": ["catering.cafe.coffee_shop", "catering.cafe.coffee", "catering.cafe.tea", "catering.cafe.bubble_tea"]}'::jsonb where name = 'Coffee Shop';
update category set source_mapping_json = '{"geoapify": ["catering.restaurant"]}'::jsonb where name = 'Restaurant';
update category set source_mapping_json = '{"geoapify": ["catering.fast_food", "catering.food_court"]}'::jsonb where name = 'Fast Food';
update category set source_mapping_json = '{"geoapify": ["catering.bar", "catering.pub", "catering.biergarten", "catering.taproom", "adult.nightclub"]}'::jsonb where name = 'Bar';
update category set source_mapping_json = '{"geoapify": ["commercial.food_and_drink.bakery"]}'::jsonb where name = 'Bakery';
update category set source_mapping_json = '{"geoapify": ["catering.cafe.ice_cream", "catering.cafe.dessert", "catering.cafe.donut", "catering.cafe.frozen_yogurt", "catering.cafe.waffle", "catering.cafe.crepe", "catering.cafe.cake", "catering.ice_cream", "commercial.food_and_drink.confectionery", "commercial.food_and_drink.chocolate"]}'::jsonb where name = 'Ice Cream & Dessert';
update category set source_mapping_json = '{"geoapify": ["production.brewery"]}'::jsonb where name = 'Brewery';
update category set source_mapping_json = '{"geoapify": ["production.winery"]}'::jsonb where name = 'Winery';
update category set source_mapping_json = '{"geoapify": ["commercial.supermarket"]}'::jsonb where name = 'Grocery Store';
-- Broad catch-all: any commercial.food_and_drink.* subtype not already
-- claimed above by a longer, more specific tag (butcher, cheese_and_dairy,
-- deli, seafood, spices, honey, nuts, organic, pasta, rice, frozen_food,
-- farm, fruit_and_vegetable, health_food) -- mirrors the original Google
-- mapping's "food_store, butcher_shop" catch-all intent.
update category set source_mapping_json = '{"geoapify": ["commercial.food_and_drink"]}'::jsonb where name = 'Specialty Food';
update category set source_mapping_json = '{"geoapify": ["commercial.convenience"]}'::jsonb where name = 'Convenience Store';

update category set source_mapping_json = '{"geoapify": ["commercial.clothing"]}'::jsonb where name = 'Clothing & Apparel';
update category set source_mapping_json = '{"geoapify": ["commercial.books"]}'::jsonb where name = 'Bookstore';
update category set source_mapping_json = '{"geoapify": ["commercial.gift_and_souvenir"]}'::jsonb where name = 'Gift & Specialty Shop';
update category set source_mapping_json = '{"geoapify": ["commercial.houseware_and_hardware", "commercial.garden", "commercial.furniture_and_interior"]}'::jsonb where name = 'Home & Garden';
-- Geoapify's own taxonomy spells this tag "elektronics" (confirmed against
-- the published category list, not a typo introduced here).
update category set source_mapping_json = '{"geoapify": ["commercial.elektronics"]}'::jsonb where name = 'Electronics';
update category set source_mapping_json = '{"geoapify": ["commercial.pet", "pet.shop"]}'::jsonb where name = 'Pet Supplies';
update category set source_mapping_json = '{"geoapify": ["commercial.florist"]}'::jsonb where name = 'Florist';
update category set source_mapping_json = '{"geoapify": ["commercial.jewelry"]}'::jsonb where name = 'Jewelry';
update category set source_mapping_json = '{"geoapify": ["commercial.second_hand"]}'::jsonb where name = 'Thrift & Vintage';
-- Longer/more specific than Specialty Food's "commercial.food_and_drink"
-- catch-all, so it wins the prefix match for an actual liquor/drinks shop.
update category set source_mapping_json = '{"geoapify": ["commercial.food_and_drink.drinks"]}'::jsonb where name = 'Liquor Store';

update category set source_mapping_json = '{"geoapify": ["sport.fitness"]}'::jsonb where name = 'Gym & Fitness';
update category set source_mapping_json = '{"geoapify": []}'::jsonb where name = 'Yoga Studio';
update category set source_mapping_json = '{"geoapify": ["service.beauty.hairdresser"]}'::jsonb where name = 'Salon & Barber';
update category set source_mapping_json = '{"geoapify": ["service.beauty.spa", "leisure.spa"]}'::jsonb where name = 'Spa';
update category set source_mapping_json = '{"geoapify": ["healthcare.pharmacy", "commercial.health_and_beauty.pharmacy"]}'::jsonb where name = 'Pharmacy';
update category set source_mapping_json = '{"geoapify": ["healthcare.clinic_or_praxis", "healthcare.dentist"]}'::jsonb where name = 'Medical & Dental';
update category set source_mapping_json = '{"geoapify": ["pet.veterinary"]}'::jsonb where name = 'Veterinary';

update category set source_mapping_json = '{"geoapify": ["service.financial.bank", "service.financial.atm"]}'::jsonb where name = 'Bank & ATM';
update category set source_mapping_json = '{"geoapify": ["service.cleaning.laundry", "service.cleaning.dry_cleaning"]}'::jsonb where name = 'Laundry & Dry Cleaning';
update category set source_mapping_json = '{"geoapify": ["service.vehicle.repair", "service.vehicle.car_wash"]}'::jsonb where name = 'Auto Repair & Wash';
update category set source_mapping_json = '{"geoapify": ["service.post.office", "service.post.parcel_locker"]}'::jsonb where name = 'Post Office & Shipping';
update category set source_mapping_json = '{"geoapify": ["office.estate_agent", "service.estate_agent"]}'::jsonb where name = 'Real Estate';
update category set source_mapping_json = '{"geoapify": ["office.insurance"]}'::jsonb where name = 'Insurance';
update category set source_mapping_json = '{"geoapify": ["office.lawyer"]}'::jsonb where name = 'Legal Services';
update category set source_mapping_json = '{"geoapify": ["office.accountant", "office.tax_advisor"]}'::jsonb where name = 'Accounting & Tax';

update category set source_mapping_json = '{"geoapify": ["entertainment.cinema"]}'::jsonb where name = 'Movie Theater';
update category set source_mapping_json = '{"geoapify": ["entertainment.culture.theatre"]}'::jsonb where name = 'Performing Arts';
update category set source_mapping_json = '{"geoapify": ["entertainment.culture.gallery"]}'::jsonb where name = 'Art Gallery';
update category set source_mapping_json = '{"geoapify": ["entertainment.museum"]}'::jsonb where name = 'Museum';
update category set source_mapping_json = '{"geoapify": ["leisure.park", "leisure.playground"]}'::jsonb where name = 'Park & Playground';
update category set source_mapping_json = '{"geoapify": ["education.library"]}'::jsonb where name = 'Library';
update category set source_mapping_json = '{"geoapify": ["activity.community_center"]}'::jsonb where name = 'Community Center';

-- Kept to "hotel" only, matching the existing restriction (see
-- 20260706034000_restrict_lodging_to_hotels.sql) that excludes Airbnb/VRBO
-- -style short-term rentals -- Geoapify's accommodation.apartment/
-- guest_house/hostel/motel/hut cover that same short-term-rental territory
-- under OSM's accommodation namespace.
update category set source_mapping_json = '{"geoapify": ["accommodation.hotel"]}'::jsonb where name = 'Hotel & Lodging';
