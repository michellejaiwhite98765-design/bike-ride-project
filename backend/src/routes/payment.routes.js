import { Router } from "express";
import { paymentController } from "../controllers/payment.controller.js";
import { authenticate } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { createOrderSchema, verifyPaymentSchema } from "../validators/payment.validator.js";

// Mounted at /api/payments. The /webhook path is handled separately in app.js
// (before the JSON body parser) since its HMAC check needs the raw request body.
export const paymentRoutes = Router();

paymentRoutes.use(authenticate);

/**
 * @openapi
 * /payments/orders:
 *   post:
 *     tags: [Payments]
 *     summary: Create a payment order for a WITH_TIP booking. Amount is always computed server-side.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [bookingId]
 *             properties:
 *               bookingId: { type: string, format: uuid }
 *     responses:
 *       200: { description: Order created }
 * /payments/verify:
 *   post:
 *     tags: [Payments]
 *     summary: Verify a completed payment and confirm the booking
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [bookingId, providerOrderId, providerPaymentId, signature]
 *             properties:
 *               bookingId: { type: string, format: uuid }
 *               providerOrderId: { type: string }
 *               providerPaymentId: { type: string }
 *               signature: { type: string }
 *     responses:
 *       200: { description: Payment verified, booking confirmed (idempotent) }
 *       400: { description: Signature verification failed }
 */
paymentRoutes.post("/orders", validateBody(createOrderSchema), paymentController.createOrder);
paymentRoutes.post("/verify", validateBody(verifyPaymentSchema), paymentController.verify);
