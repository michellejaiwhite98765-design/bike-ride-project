import { Router } from "express";
import { rideRequestController } from "../controllers/rideRequest.controller.js";
import { authenticate } from "../middleware/auth.js";
import { validateParams } from "../middleware/validate.js";
import { idParamSchema } from "../validators/common.validator.js";

// Mounted at /api/ride-requests
export const rideRequestActionRoutes = Router();

rideRequestActionRoutes.use(authenticate);

/**
 * @openapi
 * /ride-requests/{id}/accept:
 *   put:
 *     tags: [Ride Requests]
 *     summary: Accept a ride request (owner only). Atomically reserves a seat and creates the booking.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Booking created (CONFIRMED for WITHOUT_TIP, PAYMENT_PENDING for WITH_TIP) }
 *       409: { description: No seats are available for this ride }
 * /ride-requests/{id}/reject:
 *   put:
 *     tags: [Ride Requests]
 *     summary: Reject a ride request (owner only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Request rejected }
 * /ride-requests/{id}/cancel:
 *   put:
 *     tags: [Ride Requests]
 *     summary: Cancel your own pending request (passenger only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Request cancelled }
 */
rideRequestActionRoutes.put("/:id/accept", validateParams(idParamSchema), rideRequestController.accept);
rideRequestActionRoutes.put("/:id/reject", validateParams(idParamSchema), rideRequestController.reject);
rideRequestActionRoutes.put("/:id/cancel", validateParams(idParamSchema), rideRequestController.cancel);
