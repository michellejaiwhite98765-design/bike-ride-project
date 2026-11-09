import { z } from "zod";
import { mobile } from "./auth.validator.js";
import { language } from "./language.js";

export const updateProfileSchema = z.object({
  firstName: z.string().trim().min(1).max(50).optional(),
  lastName: z.string().trim().min(1).max(50).optional(),
  // A new mobile number must come with the token from POST /auth/phone-otp/verify
  // for that same number (see userService.updateProfile).
  phone: mobile.optional(),
  phoneVerificationToken: z.string().trim().min(1).optional(),
  // From POST /users/me/phone-otp/verify: proves the user still has the current number.
  currentPhoneToken: z.string().trim().min(1).optional(),
  language: language.optional(),
});

export const verifyOwnPhoneOtpSchema = z
  .object({
    otp: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code").optional(),
    // Firebase Phone Auth: the app checked the code with Firebase and sends its ID token.
    firebaseIdToken: z.string().min(20).max(5000).optional(),
    profileImage: z.string().trim().url().optional().nullable(),
    bio: z.string().trim().max(500).optional().nullable(),
  })
  .refine((d) => d.otp || d.firebaseIdToken, { message: "Enter the 6-digit code", path: ["otp"] });

// Indian driving licence, e.g. "TN01 20190012345" / "MH-1220110012345":
// state code, then digits (spaces and dashes are ignored).
export const drivingLicenceSchema = z.object({
  licenceNumber: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s-]/g, "").toUpperCase())
    .refine((v) => /^[A-Z]{2}[0-9A-Z]{2}[0-9]{7,12}$/.test(v), "Enter a valid driving licence number, e.g. TN01 20190012345"),
  holderName: z.string().trim().min(2).max(100).optional(),
  expiryDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter the expiry date"),
  // Needed for the government registry check (Way2API).
  dateOfBirth: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter your date of birth").optional(),
});
