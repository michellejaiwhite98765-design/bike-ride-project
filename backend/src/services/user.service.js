import { userRepository } from "../repositories/user.repository.js";
import { ratingRepository } from "../repositories/rating.repository.js";
import { ApiError } from "../utils/ApiError.js";
import { serializeUser } from "../utils/serializers.js";
import { normalizePhone, phoneOtpService } from "./phoneOtp.service.js";

export const userService = {
  /** Step 1 of changing the number: OTP to the user's current number. */
  async sendOwnPhoneOtp(userId) {
    const user = await userRepository.findById(userId);
    if (!user?.phone) throw ApiError.badRequest("Your account has no mobile number");
    return phoneOtpService.send(user.phone, { ownNumber: true });
  },

  async verifyOwnPhoneOtp(userId, otp, firebaseIdToken) {
    const user = await userRepository.findById(userId);
    const { verificationToken, validForMinutes } = await phoneOtpService.verify(user.phone, otp, firebaseIdToken);
    return { currentPhoneToken: verificationToken, validForMinutes };
  },

  async updateProfile(userId, { phone: rawPhone, phoneVerificationToken, currentPhoneToken, ...data }) {
    // Changing the mobile number needs two OTPs: one to the current number
    // (it's really you) and one to the new number (you have it).
    if (rawPhone) {
      const phone = normalizePhone(rawPhone);
      const current = await userRepository.findById(userId);
      if (phone !== current?.phone) {
        const existing = await userRepository.findByPhone(phone);
        if (existing && existing.id !== userId) throw ApiError.conflict("This phone number is already registered to another account");
        if (current?.phone && !(await phoneOtpService.isVerified(current.phone, currentPhoneToken))) {
          throw ApiError.badRequest("Please verify your current mobile number with the OTP first");
        }
        if (!(await phoneOtpService.isVerified(phone, phoneVerificationToken))) {
          throw ApiError.badRequest("Please verify your new mobile number with the OTP first");
        }
        // Both checked: use them up (so neither can be replayed).
        if (current?.phone) await phoneOtpService.consume(current.phone, currentPhoneToken);
        await phoneOtpService.consume(phone, phoneVerificationToken);
        data.phone = phone;
        data.phoneVerifiedAt = new Date();
      }
    }
    const user = await userRepository.update(userId, data);
    return serializeUser(user);
  },

  async getPublicProfile(userId) {
    const user = await userRepository.findById(userId);
    if (!user || !user.isActive) throw ApiError.notFound("User not found");

    const ratingAgg = await ratingRepository.aggregateForReviewee(userId);

    const { passwordHash, resetToken, resetTokenExpiry, phone, email, ...publicFields } = user;
    return {
      ...publicFields,
      rating: ratingAgg.avgScore ? Number(ratingAgg.avgScore.toFixed(2)) : null,
      ratingCount: ratingAgg.countScore,
    };
  },
};
