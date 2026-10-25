-- The actual road route the rider picked when creating the ride (from the
-- routing service), so "is this passenger near the ride?" is measured against
-- the real road rather than the straight line between start and destination.
-- NULL for rides created before this existed (or when routing failed); those
-- fall back to the straight line.
ALTER TABLE "rides" ADD COLUMN IF NOT EXISTS "route_geog" geography(LineString, 4326);
CREATE INDEX IF NOT EXISTS "rides_route_geog_idx" ON "rides" USING GIST ("route_geog");
