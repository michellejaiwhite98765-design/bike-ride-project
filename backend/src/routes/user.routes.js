import { Router } from "express";
import { userController } from "../controllers/user.controller.js";
import { authenticate } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimiter.js";
import { validateBody, validateParams } from "../middleware/validate.js";
import { updateProfileSchema, verifyOwnPhoneOtpSchema } from "../validators/user.validator.js";
import { idParamSchema } from "../validators/common.validator.js";

export const userRoutes = Router();

/**
 * @openapi
 * /users/me:
 *   get:
 *     tags: [Users]
 *     summary: Get the current user's full profile
 *     responses:
 *       200: { description: Current user }
 *   put:
 *     tags: [Users]
 *     summary: Update the current user's profile
 *     responses:
 *       200: { description: Profile updated }
 * /users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get a user's public profile (includes average rating)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Public profile }
 * /users/{id}/ratings:
 *   get:
 *     tags: [Users]
 *     summary: List ratings received by a user
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: List of ratings }
 */
userRoutes.get("/me", authenticate, userController.getMe);
userRoutes.put("/me", authenticate, validateBody(updateProfileSchema), userController.updateMe);
// Changing the mobile number, step 1: prove the current number (OTP to it).
userRoutes.post("/me/phone-otp", authenticate, authLimiter, userController.sendOwnPhoneOtp);
userRoutes.post("/me/phone-otp/verify", authenticate, authLimiter, validateBody(verifyOwnPhoneOtpSchema), userController.verifyOwnPhoneOtp);
userRoutes.get("/:id", authenticate, validateParams(idParamSchema), userController.getPublicProfile);
userRoutes.get("/:id/ratings", authenticate, validateParams(idParamSchema), userController.getRatings);
