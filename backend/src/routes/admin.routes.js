import { Router } from "express";
import { adminController } from "../controllers/admin.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { validateBody, validateParams } from "../middleware/validate.js";
import { idParamSchema } from "../validators/common.validator.js";
import { updateUserStatusSchema, verifyVehicleSchema } from "../validators/admin.validator.js";
import { updateSafetyReportSchema } from "../validators/safetyReport.validator.js";

export const adminRoutes = Router();

adminRoutes.use(authenticate, authorize("ADMIN"));

/**
 * @openapi
 * /admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: List all users (admin only)
 *     responses:
 *       200: { description: List of users }
 * /admin/rides:
 *   get:
 *     tags: [Admin]
 *     summary: List all rides (admin only)
 *     responses:
 *       200: { description: List of rides }
 * /admin/bookings:
 *   get:
 *     tags: [Admin]
 *     summary: List all bookings (admin only)
 *     responses:
 *       200: { description: List of bookings }
 * /admin/payments:
 *   get:
 *     tags: [Admin]
 *     summary: List all payments (admin only)
 *     responses:
 *       200: { description: List of payments }
 * /admin/reports:
 *   get:
 *     tags: [Admin]
 *     summary: List all safety reports (admin only)
 *     responses:
 *       200: { description: List of safety reports }
 */
adminRoutes.get("/users", adminController.listUsers);
adminRoutes.get("/rides", adminController.listRides);
adminRoutes.get("/bookings", adminController.listBookings);
adminRoutes.get("/payments", adminController.listPayments);
adminRoutes.get("/reports", adminController.listReports);

/**
 * @openapi
 * /admin/users/{id}/status:
 *   put:
 *     tags: [Admin]
 *     summary: Activate or deactivate a user (admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: User status updated }
 * /admin/vehicles/{id}/verify:
 *   put:
 *     tags: [Admin]
 *     summary: Update a vehicle's verification status (admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Vehicle verification updated }
 * /admin/reports/{id}:
 *   put:
 *     tags: [Admin]
 *     summary: Update a safety report's status (admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Report updated }
 */
adminRoutes.put("/users/:id/status", validateParams(idParamSchema), validateBody(updateUserStatusSchema), adminController.setUserStatus);
adminRoutes.put("/vehicles/:id/verify", validateParams(idParamSchema), validateBody(verifyVehicleSchema), adminController.verifyVehicle);
adminRoutes.put("/reports/:id", validateParams(idParamSchema), validateBody(updateSafetyReportSchema), adminController.updateReport);
