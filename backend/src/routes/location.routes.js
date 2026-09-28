import { Router } from "express";
import { locationController } from "../controllers/location.controller.js";
import { authenticate } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { resolveLocationLinkSchema } from "../validators/location.validator.js";

export const locationRoutes = Router();

locationRoutes.use(authenticate);

/**
 * @openapi
 * /locations/resolve-link:
 *   post:
 *     tags: [Locations]
 *     summary: Resolve a shared Google Maps / WhatsApp location short link to its final URL
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [url]
 *             properties:
 *               url: { type: string, format: uri }
 *     responses:
 *       200: { description: Resolved URL }
 *       400: { description: Not a resolvable Google Maps link }
 */
locationRoutes.post("/resolve-link", validateBody(resolveLocationLinkSchema), locationController.resolveSharedLink);
