import { z } from "zod";
import { mobile } from "./auth.validator.js";

export const updateProfileSchema = z.object({
  firstName: z.string().trim().min(1).max(50).optional(),
  lastName: z.string().trim().min(1).max(50).optional(),
  // A new mobile number must come with the token from POST /auth/phone-otp/verify
  // for that same number (see userService.updateProfile).
  phone: mobile.optional(),
  phoneVerificationToken: z.string().trim().min(1).optional(),
  // From POST /users/me/phone-otp/verify: proves the user still has the current number.
  currentPhoneToken: z.string().trim().min(1).optional(),
});

export const verifyOwnPhoneOtpSchema = z.object({
  otp: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code"),
  profileImage: z.string().trim().url().optional().nullable(),
  bio: z.string().trim().max(500).optional().nullable(),
});
