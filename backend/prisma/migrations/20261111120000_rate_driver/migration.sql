-- Passengers are asked to review their driver once dropped off.
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'RATE_DRIVER';
