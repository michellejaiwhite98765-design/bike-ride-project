import { Router } from "express";
import { rideRequestController } from "../controllers/rideRequest.controller.js";
import { validateBody, validateQuery } from "../middleware/validate.js";
import { createRideRequestSchema, joinCheckQuerySchema } from "../validators/rideRequest.validator.js";

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

/**
 * @openapi
 * /rides/{rideId}/requests/mine:
 *   get:
 *     tags: [Ride Requests]
 *     summary: Get the current user's own active request for this ride (REQUESTED/ACCEPTED), or null
 *     parameters:
 *       - in: path
 *         name: rideId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: The caller's active request for this ride, or null }
 */
rideRequestRoutes.get("/mine", rideRequestController.getMine);

/**
 * @openapi
 * /rides/{rideId}/requests/join-check:
 *   get:
 *     tags: [Ride Requests]
 *     summary: Which pickup zone a pickup (and optional drop) falls in - ON_ROUTE, DETOUR (with extra tip) or TOO_FAR
 *     parameters:
 *       - { in: path, name: rideId, required: true, schema: { type: string, format: uuid } }
 *       - { in: query, name: pickupLatitude, required: true, schema: { type: number } }
 *       - { in: query, name: pickupLongitude, required: true, schema: { type: number } }
 *       - { in: query, name: dropLatitude, schema: { type: number } }
 *       - { in: query, name: dropLongitude, schema: { type: number } }
 *     responses:
 *       200: { description: "{ zone, pickupDistanceKm, dropDistanceKm, onRouteKm, limitKm, extraTip, reason, message }" }
 */
rideRequestRoutes.get("/join-check", validateQuery(joinCheckQuerySchema), rideRequestController.joinCheck);
