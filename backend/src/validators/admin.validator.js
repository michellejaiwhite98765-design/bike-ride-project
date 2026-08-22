import { z } from "zod";

export const updateUserStatusSchema = z.object({
  isActive: z.boolean(),
});

export const verifyVehicleSchema = z.object({
  verificationStatus: z.enum(["PENDING", "VERIFIED", "REJECTED"]),
});
