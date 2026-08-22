import { Router } from "express";
import { notificationController } from "../controllers/notification.controller.js";
import { authenticate } from "../middleware/auth.js";
import { validateParams } from "../middleware/validate.js";
import { idParamSchema } from "../validators/common.validator.js";

export const notificationRoutes = Router();

notificationRoutes.use(authenticate);

/**
 * @openapi
 * /notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: List the current user's notifications
 *     responses:
 *       200: { description: List of notifications }
 * /notifications/read-all:
 *   put:
 *     tags: [Notifications]
 *     summary: Mark all notifications as read
 *     responses:
 *       200: { description: Marked as read }
 * /notifications/{id}/read:
 *   put:
 *     tags: [Notifications]
 *     summary: Mark a single notification as read
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Marked as read }
 */
notificationRoutes.get("/", notificationController.list);
notificationRoutes.put("/read-all", notificationController.markAllRead);
notificationRoutes.put("/:id/read", validateParams(idParamSchema), notificationController.markRead);
