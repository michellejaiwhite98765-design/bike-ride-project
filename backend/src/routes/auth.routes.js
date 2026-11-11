import { Router } from "express";
import { authController } from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimiter.js";
import { validateBody } from "../middleware/validate.js";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  sendPhoneOtpSchema,
  verifyPhoneOtpSchema,
} from "../validators/auth.validator.js";

export const authRoutes = Router();

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [firstName, lastName, email, phone, password]
 *             properties:
 *               firstName: { type: string }
 *               lastName: { type: string }
 *               email: { type: string, format: email }
 *               phone: { type: string }
 *               password: { type: string, format: password }
 *     responses:
 *       201: { description: Registered successfully }
 *       409: { description: Duplicate email or phone }
 */
// Sign-up phone verification: send a code, then verify it to get the
// phoneVerificationToken that /register requires.
authRoutes.post("/phone-otp", authLimiter, validateBody(sendPhoneOtpSchema), authController.sendPhoneOtp);
authRoutes.post("/phone-otp/verify", authLimiter, validateBody(verifyPhoneOtpSchema), authController.verifyPhoneOtp);

authRoutes.post("/register", authLimiter, validateBody(registerSchema), authController.register);

/**
 * @openapi
 * /auth/login/otp:
 *   post:
 *     tags: [Auth]
 *     summary: Send a login code to a registered mobile number
 *     security: []
 *     responses:
 *       200: { description: Code sent }
 *       404: { description: No account with this number }
 * /auth/login/otp/verify:
 *   post:
 *     tags: [Auth]
 *     summary: Log in with the mobile number and its code (no password)
 *     security: []
 *     responses:
 *       200: { description: Logged in - returns the user and token }
 */
authRoutes.post("/login/otp", authLimiter, validateBody(sendPhoneOtpSchema), authController.sendLoginOtp);
authRoutes.post("/login/otp/verify", authLimiter, validateBody(verifyPhoneOtpSchema), authController.loginWithPhone);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login with email and password
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, format: password }
 *     responses:
 *       200: { description: Login successful }
 *       401: { description: Invalid credentials }
 */
authRoutes.post("/login", authLimiter, validateBody(loginSchema), authController.login);

authRoutes.post("/logout", authenticate, authController.logout);
authRoutes.get("/me", authenticate, authController.me);

authRoutes.post(
  "/forgot-password",
  authLimiter,
  validateBody(forgotPasswordSchema),
  authController.forgotPassword
);
authRoutes.post("/reset-password", authLimiter, validateBody(resetPasswordSchema), authController.resetPassword);
