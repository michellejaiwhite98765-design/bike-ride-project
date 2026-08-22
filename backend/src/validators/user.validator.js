import { z } from "zod";

export const updateProfileSchema = z.object({
  firstName: z.string().trim().min(1).max(50).optional(),
  lastName: z.string().trim().min(1).max(50).optional(),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9]{10,15}$/, "Invalid phone number")
    .optional(),
  profileImage: z.string().trim().url().optional().nullable(),
  bio: z.string().trim().max(500).optional().nullable(),
});
