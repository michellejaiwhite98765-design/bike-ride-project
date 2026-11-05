-- Driving licence registry check (Way2API, government RTO records):
-- the holder's date of birth is needed for the lookup.
ALTER TABLE "driving_licences" ADD COLUMN IF NOT EXISTS "date_of_birth" DATE;
ALTER TABLE "driving_licences" ADD COLUMN IF NOT EXISTS "verification_provider" TEXT;
ALTER TABLE "driving_licences" ADD COLUMN IF NOT EXISTS "provider_order_id" TEXT;
ALTER TABLE "driving_licences" ADD COLUMN IF NOT EXISTS "vehicle_classes" TEXT[];
