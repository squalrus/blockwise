-- Drop the free-text POI "type" classification field (e.g. "park",
-- "landmark", "transit museum") -- it was never structured or validated,
-- and POIs no longer carry any type/classification string at all.
alter table venue drop column type;
