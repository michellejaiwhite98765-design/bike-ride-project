import { Router } from "express";
import { rideRequestController } from "../controllers/rideRequest.controller.js";
import { validateBody } from "../middleware/validate.js";
import { createRideRequestSchema } from "../validators/rideRequest.validator.js";

// Mounted at /api/rides/:rideId/requests (mergeParams to reach :rideId).
export const rideRequestRoutes = Router({ mergeParams: true });

/**
 * @openapi
 * /rides/{rideId}/requests:
 *   post:
 *     tags: [Ride Requests]
 *     summary: Request to join a published ride
 *     parameters:
 *       - in: path
 *         name: rideId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       201: { description: Request submitted }
 *       409: { description: Duplicate active request or not enough seats }
 *   get:
 *     tags: [Ride Requests]
 *     summary: List requests for a ride (owner only)
 *     parameters:
 *       - in: path
 *         name: rideId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: List of ride requests }
 */
rideRequestRoutes.post("/", validateBody(createRideRequestSchema), rideRequestController.create);
rideRequestRoutes.get("/", rideRequestController.listForRide);
