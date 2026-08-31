ALTER TYPE "VehicleType" ADD VALUE IF NOT EXISTS 'CAR';

ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "seat_capacity" INTEGER;

-- Existing two-wheelers/bicycles always carry exactly one passenger seat (no driver seat counted).
UPDATE "vehicles" SET "seat_capacity" = 1
  WHERE "seat_capacity" IS NULL AND "vehicle_type" IN ('MOTORCYCLE', 'SCOOTER', 'BICYCLE');

ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_seat_capacity_check" CHECK ("seat_capacity" IS NULL OR "seat_capacity" >= 1);
