import { Router } from "express";
import { bookingController } from "../controllers/booking.controller.js";
import { authenticate } from "../middleware/auth.js";
import { validateParams } from "../middleware/validate.js";
import { idParamSchema } from "../validators/common.validator.js";

export const bookingRoutes = Router();

bookingRoutes.use(authenticate);

/**
 * @openapi
 * /bookings:
 *   get:
 *     tags: [Bookings]
 *     summary: List the current user's bookings (as passenger)
 *     responses:
 *       200: { description: List of bookings }
 */
bookingRoutes.get("/", bookingController.listMine);

/**
 * @openapi
 * /bookings/{id}:
 *   get:
 *     tags: [Bookings]
 *     summary: Get booking details (passenger or ride owner only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Booking }
 * /bookings/{id}/cancel:
 *   post:
 *     tags: [Bookings]
 *     summary: Cancel a booking (passenger only, before the ride starts). Releases the seat and refunds if paid.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Booking cancelled }
 */
bookingRoutes.get("/:id", validateParams(idParamSchema), bookingController.getById);
bookingRoutes.post("/:id/cancel", validateParams(idParamSchema), bookingController.cancel);
