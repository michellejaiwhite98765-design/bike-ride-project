import { bookingRepository } from "../repositories/booking.repository.js";
import { ratingRepository } from "../repositories/rating.repository.js";
import { ApiError } from "../utils/ApiError.js";
import { audit } from "../utils/audit.js";
import { notificationService } from "./notification.service.js";

export const ratingService = {
  async create(reviewerId, { bookingId, revieweeId, score, comment }) {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) throw ApiError.notFound("Booking not found");
    if (booking.ride.status !== "COMPLETED") {
      throw ApiError.conflict("You can only rate after the ride has been completed");
    }

    const participants = [booking.passengerId, booking.ride.riderId];
    if (!participants.includes(reviewerId)) throw ApiError.forbidden("You were not part of this booking");
    if (!participants.includes(revieweeId) || revieweeId === reviewerId) {
      throw ApiError.badRequest("revieweeId must be the other party in this booking");
    }

    const existing = await ratingRepository.findExisting(bookingId, reviewerId, revieweeId);
    if (existing) throw ApiError.conflict("You have already rated this user for this booking");

    const rating = await ratingRepository.create({ bookingId, reviewerId, revieweeId, score, comment });
    await audit(null, { userId: reviewerId, action: "RATING_CREATED", entityType: "Rating", entityId: rating.id });
    await notificationService.notifyNewRating(rating);
    return rating;
  },

  listForUser(userId) {
    return ratingRepository.findByReviewee(userId);
  },
};
