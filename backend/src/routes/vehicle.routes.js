import { Router } from "express";
import { vehicleController } from "../controllers/vehicle.controller.js";
import { authenticate } from "../middleware/auth.js";
import { validateBody, validateParams } from "../middleware/validate.js";
import { createVehicleSchema, updateVehicleSchema } from "../validators/vehicle.validator.js";
import { idParamSchema } from "../validators/common.validator.js";
import { uploadSingleRcDocument } from "../middleware/upload.js";

export const vehicleRoutes = Router();

vehicleRoutes.use(authenticate);

/**
 * @openapi
 * /vehicles:
 *   post:
 *     tags: [Vehicles]
 *     summary: Add a vehicle owned by the current user
 *     responses:
 *       201: { description: Vehicle created }
 *   get:
 *     tags: [Vehicles]
 *     summary: List the current user's vehicles
 *     responses:
 *       200: { description: List of vehicles }
 */
vehicleRoutes.post("/", validateBody(createVehicleSchema), vehicleController.create);
vehicleRoutes.get("/", vehicleController.list);

/**
 * @openapi
 * /vehicles/{id}:
 *   get:
 *     tags: [Vehicles]
 *     summary: Get a vehicle by id (owner only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Vehicle }
 *       403: { description: Not the owner }
 *   put:
 *     tags: [Vehicles]
 *     summary: Update a vehicle (owner only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Vehicle updated }
 *   delete:
 *     tags: [Vehicles]
 *     summary: Deactivate a vehicle (owner only, blocked if it has active rides)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Vehicle removed }
 *       409: { description: Vehicle has active or upcoming rides }
 */
vehicleRoutes.get("/:id", validateParams(idParamSchema), vehicleController.getById);
vehicleRoutes.put("/:id", validateParams(idParamSchema), validateBody(updateVehicleSchema), vehicleController.update);
vehicleRoutes.post("/:id/rc-document", validateParams(idParamSchema), uploadSingleRcDocument, vehicleController.uploadRcDocument);
vehicleRoutes.post("/:id/verify", validateParams(idParamSchema), vehicleController.verify);
vehicleRoutes.delete("/:id", validateParams(idParamSchema), vehicleController.remove);
