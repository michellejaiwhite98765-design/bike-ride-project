-- Boarding a ride: when the rider meets a confirmed passenger they send a
-- one-time pickup OTP; the passenger verifies it in the app to join the ride.
-- Only a hash of the OTP is stored, never the code itself.
ALTER TABLE "bookings"
  ADD COLUMN "boarding_status" TEXT NOT NULL DEFAULT 'NOT_BOARDED',
  ADD COLUMN "pickup_otp_hash" TEXT,
  ADD COLUMN "pickup_otp_sent_at" TIMESTAMP(3),
  ADD COLUMN "pickup_otp_expires_at" TIMESTAMP(3),
  ADD COLUMN "pickup_otp_attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "boarded_at" TIMESTAMP(3),
  ADD CONSTRAINT "bookings_boarding_status_check" CHECK ("boarding_status" IN ('NOT_BOARDED', 'OTP_SENT', 'BOARDED'));

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PICKUP_OTP';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PASSENGER_BOARDED';
