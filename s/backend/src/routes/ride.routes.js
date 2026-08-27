import { Router } from "express";
import { rideController } from "../controllers/ride.controller.js";
import { authenticate } from "../middleware/auth.js";
import { validateBody, validateParams, validateQuery } from "../middleware/validate.js";
import { createRideSchema, updateRideSchema, searchRideSchema } from "../validators/ride.validator.js";
import { idParamSchema } from "../validators/common.validator.js";
import { rideRequestRoutes } from "./rideRequest.routes.js";

export const rideRoutes = Router();

rideRoutes.use(authenticate);

/**
 * @openapi
 * /rides/search:
 *   get:
 *     tags: [Rides]
 *     summary: Search for nearby published rides with match scoring
 *     parameters:
 *       - in: query
 *         name: sourceLatitude
 *         schema: { type: number }
 *         required: true
 *       - in: query
 *         name: sourceLongitude
 *         schema: { type: number }
 *         required: true
 *       - in: query
 *         name: destinationLatitude
 *         schema: { type: number }
 *         required: true
 *       - in: query
 *         name: destinationLongitude
 *         schema: { type: number }
 *         required: true
 *       - in: query
 *         name: date
 *         schema: { type: string, format: date }
 *         required: true
 *       - in: query
 *         name: seats
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Ranked list of matching rides }
 */
rideRoutes.get("/search", validateQuery(searchRideSchema), rideController.search);
rideRoutes.get("/mine", rideController.listMine);

/**
 * @openapi
 * /rides:
 *   post:
 *     tags: [Rides]
 *     summary: Create a ride (starts as DRAFT)
 *     description: rideType WITHOUT_TIP requires tipAmount=0; WITH_TIP requires tipAmount>0.
 *     responses:
 *       201: { description: Ride created as draft }
 *       400: { description: Validation error (e.g. tip amount rule violated) }
 */
rideRoutes.post("/", validateBody(createRideSchema), rideController.create);

/**
 * @openapi
 * /rides/{id}:
 *   get:
 *     tags: [Rides]
 *     summary: Get ride details
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Ride }
 *       404: { description: Ride not found }
 *   put:
 *     tags: [Rides]
 *     summary: Update a ride (owner only, DRAFT/PUBLISHED only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Ride updated }
 */
rideRoutes.get("/:id/live-location", validateParams(idParamSchema), rideController.liveLocation);
rideRoutes.get("/:id", validateParams(idParamSchema), rideController.getById);
rideRoutes.put("/:id", validateParams(idParamSchema), validateBody(updateRideSchema), rideController.update);

/**
 * @openapi
 * /rides/{id}/publish:
 *   post:
 *     tags: [Rides]
 *     summary: Publish a draft ride (DRAFT -> PUBLISHED, owner only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Ride published }
 * /rides/{id}/cancel:
 *   post:
 *     tags: [Rides]
 *     summary: Cancel a ride before it starts (owner only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Ride cancelled, active bookings cancelled too }
 * /rides/{id}/start:
 *   post:
 *     tags: [Rides]
 *     summary: Start a ride (PUBLISHED -> STARTED, owner only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Ride started, confirmed passengers notified }
 * /rides/{id}/complete:
 *   post:
 *     tags: [Rides]
 *     summary: Complete a ride (STARTED -> COMPLETED, owner only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Ride completed, ratings become available }
 */
rideRoutes.post("/:id/publish", validateParams(idParamSchema), rideController.publish);
rideRoutes.post("/:id/cancel", validateParams(idParamSchema), rideController.cancel);
rideRoutes.post("/:id/start", validateParams(idParamSchema), rideController.start);
rideRoutes.post("/:id/complete", validateParams(idParamSchema), rideController.complete);

rideRoutes.use("/:rideId/requests", rideRequestRoutes);
