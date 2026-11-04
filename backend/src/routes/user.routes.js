import { Router } from "express";
import { userController } from "../controllers/user.controller.js";
import { authenticate } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimiter.js";
import { uploadSingleLicenceDocument, uploadSingleProfilePhoto } from "../middleware/upload.js";
import { validateBody, validateParams } from "../middleware/validate.js";
import { drivingLicenceSchema, updateProfileSchema, verifyOwnPhoneOtpSchema } from "../validators/user.validator.js";
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

/**
 * @openapi
 * /users/me/photo:
 *   put:
 *     tags: [Users]
 *     summary: Upload a profile photo (multipart field "photo", any picture) - stored as a small square image
 *     responses:
 *       200: { description: Updated user }
 *   delete:
 *     tags: [Users]
 *     summary: Remove the profile photo
 *     responses:
 *       200: { description: Updated user }
 */
userRoutes.put("/me/photo", authenticate, uploadSingleProfilePhoto, userController.setPhoto);
userRoutes.delete("/me/photo", authenticate, userController.removePhoto);
// Changing the mobile number, step 1: prove the current number (OTP to it).
userRoutes.post("/me/phone-otp", authenticate, authLimiter, userController.sendOwnPhoneOtp);
userRoutes.post("/me/phone-otp/verify", authenticate, authLimiter, validateBody(verifyOwnPhoneOtpSchema), userController.verifyOwnPhoneOtp);

/**
 * @openapi
 * /users/me/licence:
 *   get:
 *     tags: [Users]
 *     summary: The current user's driving licence verification
 *     responses:
 *       200: { description: "status NOT_SUBMITTED | VERIFIED | REJECTED | EXPIRED" }
 *   put:
 *     tags: [Users]
 *     summary: Submit a driving licence (multipart licenceDocument + licenceNumber, expiryDate, holderName) - verified when the number is found on the document
 *     responses:
 *       200: { description: Licence verified }
 * /users/me/rider-status:
 *   get:
 *     tags: [Users]
 *     summary: Whether the user is a rider (has a vehicle) and can create trips (verified licence + verified vehicle)
 *     responses:
 *       200: { description: Rider status }
 */
userRoutes.get("/me/licence", authenticate, userController.getLicence);
userRoutes.put("/me/licence", authenticate, uploadSingleLicenceDocument, validateBody(drivingLicenceSchema), userController.submitLicence);
userRoutes.get("/me/rider-status", authenticate, userController.riderStatus);
userRoutes.get("/:id", authenticate, validateParams(idParamSchema), userController.getPublicProfile);
userRoutes.get("/:id/ratings", authenticate, validateParams(idParamSchema), userController.getRatings);
