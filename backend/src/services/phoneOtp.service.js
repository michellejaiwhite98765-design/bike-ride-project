import crypto from "node:crypto";
import { env } from "../config/env.js";
import { phoneOtpRepository } from "../repositories/phoneOtp.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { ApiError } from "../utils/ApiError.js";
import { smsService } from "./sms.service.js";

// Sign-up phone verification. The app sends a code to the number, the user
// enters it, and gets back a short-lived verification token that /register
// requires for that same number. Codes and tokens are only stored hashed.
const OTP_VALID_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 30;
const VERIFIED_VALID_MINUTES = 30; // time to finish the sign-up form after verifying

/**
 * One stored form per number: digits only, Indian numbers as 10 digits
 * ("+91 98765 43210", "09876543210" and "9876543210" are the same phone).
 */
export function normalizePhone(raw) {
  let digits = String(raw || "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return digits;
}

const hash = (value) => crypto.createHmac("sha256", env.jwtSecret).update(value).digest("hex");

function safeEqual(a, b) {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export const phoneOtpService = {
  /**
   * @param ownNumber true when a signed-in user is proving they still have
   *   their current number (changing it) - that number is registered, by them.
   */
  async send(rawPhone, { ownNumber = false } = {}) {
    const phone = normalizePhone(rawPhone);
    if (!ownNumber && (await userRepository.findByPhone(phone))) {
      throw ApiError.conflict("This phone number is already registered. Please log in instead.");
    }

    const existing = await phoneOtpRepository.find(phone);
    if (existing?.sentAt) {
      const wait = RESEND_COOLDOWN_SECONDS - Math.floor((Date.now() - new Date(existing.sentAt).getTime()) / 1000);
      if (wait > 0) throw ApiError.tooManyRequests(`Please wait ${wait}s before requesting another code`);
    }

    const otp = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
    const expiresAt = new Date(Date.now() + OTP_VALID_MINUTES * 60 * 1000);
    await phoneOtpRepository.saveCode(phone, hash(`${phone}:${otp}`), expiresAt);

    let sent;
    try {
      sent = await smsService.sendOtp(phone, otp);
    } catch (err) {
      // Nothing was delivered: drop the code so the user can retry straight away.
      await phoneOtpRepository.remove(phone);
      throw err;
    }
    return {
      phone,
      expiresAt,
      resendAfterSeconds: RESEND_COOLDOWN_SECONDS,
      smsSent: Boolean(sent.delivered),
      // OTP_DEV_MODE: also hand the code to the app (testing / no SMS provider yet).
      ...(sent.devMode ? { devOtp: otp } : {}),
    };
  },

  async verify(rawPhone, otp) {
    const phone = normalizePhone(rawPhone);
    const state = await phoneOtpRepository.find(phone);
    if (!state) throw ApiError.badRequest("Request a verification code first");
    if (new Date(state.expiresAt).getTime() < Date.now()) {
      throw ApiError.badRequest("This code has expired. Please request a new one");
    }
    if (state.attempts >= MAX_ATTEMPTS) {
      throw ApiError.tooManyRequests("Too many wrong attempts. Please request a new code");
    }
    if (!safeEqual(hash(`${phone}:${otp}`), state.otpHash)) {
      const attempts = await phoneOtpRepository.bumpAttempts(phone);
      const left = MAX_ATTEMPTS - attempts;
      throw ApiError.badRequest(left > 0 ? `Incorrect code. ${left} attempt${left === 1 ? "" : "s"} left` : "Incorrect code. Please request a new one");
    }

    const token = crypto.randomBytes(24).toString("hex");
    await phoneOtpRepository.markVerified(phone, hash(`verified:${token}`), new Date(Date.now() + VERIFIED_VALID_MINUTES * 60 * 1000));
    return { phone, verificationToken: token, validForMinutes: VERIFIED_VALID_MINUTES };
  },

  /** True if this phone was verified with this token (and it hasn't expired), without using it up. */
  async isVerified(phone, token) {
    const state = await phoneOtpRepository.find(normalizePhone(phone));
    return Boolean(
      token &&
        state?.verificationTokenHash &&
        new Date(state.verificationExpiresAt).getTime() > Date.now() &&
        safeEqual(hash(`verified:${token}`), state.verificationTokenHash)
    );
  },

  /** For /register: true (and used up) only if this phone was verified with this token. */
  consume(phone, token, client) {
    return phoneOtpRepository.consumeVerification(normalizePhone(phone), hash(`verified:${token}`), client);
  },
};
