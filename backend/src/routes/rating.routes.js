import { Router } from "express";
import { ratingController } from "../controllers/rating.controller.js";
import { authenticate } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { createRatingSchema } from "../validators/rating.validator.js";

export const ratingRoutes = Router();

/**
 * @openapi
 * /ratings:
 *   post:
 *     tags: [Ratings]
 *     summary: Rate the other party in a completed booking
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [bookingId, revieweeId, score]
 *             properties:
 *               bookingId: { type: string, format: uuid }
 *               revieweeId: { type: string, format: uuid }
 *               score: { type: integer, minimum: 1, maximum: 5 }
 *               comment: { type: string }
 *     responses:
 *       201: { description: Rating submitted }
 *       409: { description: Ride not completed yet, or already rated }
 */
ratingRoutes.post("/", authenticate, validateBody(createRatingSchema), ratingController.create);
