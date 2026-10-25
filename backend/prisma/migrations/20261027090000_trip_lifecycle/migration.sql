-- Notifications for the trip lifecycle: a passenger leaving a ride, a
-- booking dropped (unpaid at start / payment deadline), a ride expiring.
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'RIDE_REQUEST_CANCELLED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'BOOKING_CANCELLED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'RIDE_EXPIRED';
