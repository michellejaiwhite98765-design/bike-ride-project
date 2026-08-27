import { z } from "zod";

export const createOrderSchema = z.object({
  bookingId: z.string().uuid(),
});

export const verifyPaymentSchema = z.object({
  bookingId: z.string().uuid(),
  providerOrderId: z.string().min(1),
  providerPaymentId: z.string().min(1),
  signature: z.string().min(1),
});
