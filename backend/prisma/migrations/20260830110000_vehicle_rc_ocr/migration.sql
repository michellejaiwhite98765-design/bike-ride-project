-- RC document identity fields. The vehicle remains PENDING until both
-- document OCR matching and government verification succeed.
ALTER TABLE "vehicles"
  ADD COLUMN IF NOT EXISTS "rc_extracted_registration_number" TEXT,
  ADD COLUMN IF NOT EXISTS "rc_ocr_status" TEXT NOT NULL DEFAULT 'NOT_STARTED';

ALTER TABLE "vehicles"
  DROP CONSTRAINT IF EXISTS "vehicles_rc_ocr_status_check";

ALTER TABLE "vehicles"
  ADD CONSTRAINT "vehicles_rc_ocr_status_check"
  CHECK ("rc_ocr_status" IN ('NOT_STARTED', 'MATCHED', 'MISMATCH', 'FAILED'));


-- Backfill geography values for rides created before the PostGIS trigger existed.
UPDATE "rides"
SET
  "source_geog" = ST_SetSRID(ST_MakePoint("source_longitude"::float8, "source_latitude"::float8), 4326)::geography,
  "destination_geog" = ST_SetSRID(ST_MakePoint("destination_longitude"::float8, "destination_latitude"::float8), 4326)::geography
WHERE "source_geog" IS NULL OR "destination_geog" IS NULL;
