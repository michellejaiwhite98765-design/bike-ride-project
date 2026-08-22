import { z } from "zod";

export const createSafetyReportSchema = z.object({
  reportedUserId: z.string().uuid(),
  rideId: z.string().uuid().optional(),
  reason: z.string().trim().min(1).max(150),
  details: z.string().trim().max(1000).optional(),
});

export const updateSafetyReportSchema = z.object({
  status: z.enum(["OPEN", "REVIEWING", "RESOLVED", "DISMISSED"]),
  adminNotes: z.string().trim().max(1000).optional(),
});
