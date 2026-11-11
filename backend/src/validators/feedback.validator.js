import { z } from "zod";

export const FEEDBACK_CATEGORIES = ["APP", "RIDE", "PAYMENT", "DRIVER", "SUGGESTION", "OTHER"];
export const FEEDBACK_STATUSES = ["OPEN", "IN_REVIEW", "RESOLVED"];

export const createFeedbackSchema = z.object({
  category: z.enum(FEEDBACK_CATEGORIES),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  message: z.string().trim().min(5, "Please write at least a few words").max(2000),
});

export const updateFeedbackSchema = z
  .object({
    status: z.enum(FEEDBACK_STATUSES).optional(),
    adminReply: z.string().trim().min(1).max(2000).optional(),
  })
  .refine((v) => v.status || v.adminReply, { message: "Give a status or a reply" });
