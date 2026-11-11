-- Trips not started on time: the rider is warned 10 minutes after the start
-- time, and the trip is cancelled automatically after 15.
ALTER TABLE "rides" ADD COLUMN IF NOT EXISTS "start_reminder_sent_at" TIMESTAMP(3);
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'RIDE_START_REMINDER';
