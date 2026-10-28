-- Dropping off + paying the rider: the same OTP columns now also carry the
-- drop-off OTP (one active OTP per booking at a time), the passenger's
-- boarding state grows DROP_OTP_SENT and DROPPED, and the rider's share of a
-- paid booking is HELD until the passenger confirms the drop with that OTP.
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_boarding_status_check";
ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_boarding_status_check"
    CHECK ("boarding_status" IN ('NOT_BOARDED', 'OTP_SENT', 'BOARDED', 'DROP_OTP_SENT', 'DROPPED')),
  ADD COLUMN "dropped_at" TIMESTAMP(3),
  ADD COLUMN "rider_payout_status" TEXT NOT NULL DEFAULT 'NONE',
  ADD COLUMN "rider_payout_amount" DECIMAL(10, 2),
  ADD COLUMN "rider_payout_released_at" TIMESTAMP(3),
  ADD CONSTRAINT "bookings_rider_payout_status_check"
    CHECK ("rider_payout_status" IN ('NONE', 'HELD', 'RELEASED', 'REFUNDED'));

-- Bookings that were already paid before this change: the rider's share is held.
UPDATE "bookings"
SET "rider_payout_status" = 'HELD', "rider_payout_amount" = "tip_amount"
WHERE "payment_status" = 'SUCCESS';

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'DROP_OTP';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PASSENGER_DROPPED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PAYOUT_RECEIVED';
