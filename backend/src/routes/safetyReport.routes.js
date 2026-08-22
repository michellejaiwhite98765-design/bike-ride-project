import { Router } from "express";
import { safetyReportController } from "../controllers/safetyReport.controller.js";
import { authenticate } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { createSafetyReportSchema } from "../validators/safetyReport.validator.js";

export const safetyReportRoutes = Router();

/**
 * @openapi
 * /safety-reports:
 *   post:
 *     tags: [Safety]
 *     summary: File a safety report against another user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reportedUserId, reason]
 *             properties:
 *               reportedUserId: { type: string, format: uuid }
 *               rideId: { type: string, format: uuid }
 *               reason: { type: string }
 *               details: { type: string }
 *     responses:
 *       201: { description: Report filed }
 */
safetyReportRoutes.post("/", authenticate, validateBody(createSafetyReportSchema), safetyReportController.create);
