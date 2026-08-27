import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";

import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { userRepository } from "../repositories/user.repository.js";
import { ApiError } from "../utils/ApiError.js";
import { serializeUser } from "../utils/serializers.js";

const BCRYPT_ROUNDS = 12;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

function issueToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export const authService = {
  async register({ firstName, lastName, email, phone, password }) {
    const [existingEmail, existingPhone] = await Promise.all([
      userRepository.findByEmail(email),
      userRepository.findByPhone(phone),
    ]);
    if (existingEmail) throw ApiError.conflict("Email is already registered");
    if (existingPhone) throw ApiError.conflict("Phone number is already registered");

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await userRepository.create({ firstName, lastName, email, phone, passwordHash });

    return { user: serializeUser(user), token: issueToken(user) };
  },

  async login({ email, password }) {
    const user = await userRepository.findByEmail(email);
    if (!user) throw ApiError.unauthorized("Invalid email or password");

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw ApiError.unauthorized("Invalid email or password");
    if (!user.isActive) throw ApiError.forbidden("This account has been deactivated");

    return { user: serializeUser(user), token: issueToken(user) };
  },

  async me(user) {
    return serializeUser(user);
  },

  async forgotPassword({ email }) {
    const user = await userRepository.findByEmail(email);
    if (user) {
      const rawToken = crypto.randomBytes(32).toString("hex");
      await userRepository.update(user.id, {
        resetToken: hashToken(rawToken),
        resetTokenExpiry: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      });
      const resetLink = `${env.clientUrl}/reset-password?token=${rawToken}`;
      // SMTP is not wired up for this MVP; log the link so the flow is testable end-to-end.
      // Swap this for a real email send (see env SMTP_*) without touching the token logic above.
      logger.info(`[dev-email] Password reset link for ${email}: ${resetLink}`);
    }
    // Always respond the same way so the endpoint can't be used to enumerate accounts.
    return { message: "If an account with that email exists, a reset link has been sent." };
  },

  async resetPassword({ token, password }) {
    const user = await userRepository.findByResetToken(hashToken(token));
    if (!user) throw ApiError.badRequest("Reset token is invalid or has expired");

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await userRepository.update(user.id, { passwordHash, resetToken: null, resetTokenExpiry: null });
    return { message: "Password has been reset successfully" };
  },
};
