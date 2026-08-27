import { z } from "zod";

export const createRatingSchema = z.object({
  bookingId: z.string().uuid(),
  revieweeId: z.string().uuid(),
  score: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(500).optional(),
});
