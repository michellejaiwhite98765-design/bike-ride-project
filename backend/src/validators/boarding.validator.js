import { z } from "zod";

export const verifyPickupSchema = z.object({
  otp: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit OTP"),
});
