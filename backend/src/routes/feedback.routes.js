import { Router } from "express";
import { feedbackController } from "../controllers/feedback.controller.js";
import { authenticate } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { createFeedbackSchema } from "../validators/feedback.validator.js";

export const feedbackRoutes = Router();

/**
 * @openapi
 * /feedback:
 *   post:
 *     tags: [Feedback]
 *     summary: Send feedback about the app or service
 *     responses:
 *       201: { description: Feedback received }
 *   get:
 *     tags: [Feedback]
 *     summary: My feedback, with any admin replies
 *     responses:
 *       200: { description: List of my feedback }
 */
feedbackRoutes.post("/", authenticate, validateBody(createFeedbackSchema), feedbackController.create);
feedbackRoutes.get("/", authenticate, feedbackController.listMine);
