-- The road route the rider will take (from the routing service), so a
-- passenger's distance is measured to the real road, not the straight line
-- between start and end. NULL until known; the straight line is the fallback.
ALTER TABLE "rides" ADD COLUMN IF NOT EXISTS "route_geog" geography(LineString, 4326);
CREATE INDEX IF NOT EXISTS "rides_route_geog_idx" ON "rides" USING GIST ("route_geog");

-- Two-zone pickup: ON_ROUTE (close to the rider's road, no extra cost) or
-- DETOUR (the rider has to leave the road; the passenger pays an extra tip).
ALTER TABLE "ride_requests"
  ADD COLUMN IF NOT EXISTS "pickup_zone" TEXT NOT NULL DEFAULT 'ON_ROUTE',
  ADD COLUMN IF NOT EXISTS "pickup_distance_km" DECIMAL(6,2),
  ADD COLUMN IF NOT EXISTS "extra_tip" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "ride_requests" DROP CONSTRAINT IF EXISTS "ride_requests_pickup_zone_check";
ALTER TABLE "ride_requests" ADD CONSTRAINT "ride_requests_pickup_zone_check" CHECK ("pickup_zone" IN ('ON_ROUTE', 'DETOUR'));
