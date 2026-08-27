import { userRepository } from "../repositories/user.repository.js";
import { ratingRepository } from "../repositories/rating.repository.js";
import { ApiError } from "../utils/ApiError.js";
import { serializeUser } from "../utils/serializers.js";

export const userService = {
  async updateProfile(userId, data) {
    if (data.phone) {
      const existing = await userRepository.findByPhone(data.phone);
      if (existing && existing.id !== userId) throw ApiError.conflict("Phone number is already in use");
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
