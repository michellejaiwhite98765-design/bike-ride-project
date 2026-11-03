import { z } from "zod";

// Indian mobile number: 10 digits starting 6-9, optionally with +91 / 91 / 0 in front.
export const mobile = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, ""))
  .refine((v) => /^(\+?91|0)?[6-9]\d{9}$/.test(v), "Enter a valid 10-digit mobile number");

export const registerSchema = z.object({
  firstName: z.string().trim().min(1).max(50),
  lastName: z.string().trim().min(1).max(50),
  email: z.string().trim().toLowerCase().email(),
  phone: mobile,
  password: z.string().min(8).max(72),
  // From POST /auth/phone-otp/verify: proves the phone number was confirmed by OTP.
  phoneVerificationToken: z.string().trim().min(1, "Verify your phone number first"),
});

export const sendPhoneOtpSchema = z.object({ phone: mobile });

export const verifyPhoneOtpSchema = z.object({
  phone: mobile,
  otp: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code"),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(72),
});
