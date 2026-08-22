-- Add rider preference for how passengers should be picked up.
CREATE TYPE "PickupPreference" AS ENUM ('ON_ROUTE', 'PASSENGER_LOCATION');

ALTER TABLE "rides"
ADD COLUMN "pickup_preference" "PickupPreference" NOT NULL DEFAULT 'ON_ROUTE';
