-- Auto-accepted join requests: the driver is told a passenger joined.
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PASSENGER_JOINED';
