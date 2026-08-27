import { rideRepository } from "../repositories/ride.repository.js";
import { bookingRepository } from "../repositories/booking.repository.js";
import { notificationRepository } from "../repositories/notification.repository.js";
import { logger } from "../config/logger.js";

// Single fan-in point for every notification. In-app only for this MVP; email/push
// channels can be added here later without touching the call sites below.
async function dispatch({ userId, type, title, message, data }) {
  try {
    await notificationRepository.create({ userId, type, title, message, data });
  } catch (err) {
    logger.warn(`Notification dispatch failed (${type} -> ${userId}): ${err.message}`);
  }
}

export const notificationService = {
  dispatch,

  async notifyRequestCreated(rideRequest) {
    const ride = await rideRepository.findById(rideRequest.rideId);
    await dispatch({
      userId: ride.riderId,
      type: "RIDE_REQUEST_CREATED",
      title: "New ride request",
      message: `You have a new request for your ride to ${ride.destinationName}`,
      data: { rideId: ride.id, rideRequestId: rideRequest.id },
    });
  },

  async notifyRequestAccepted(rideRequest) {
    await dispatch({
      userId: rideRequest.passengerId,
      type: "RIDE_REQUEST_ACCEPTED",
      title: "Request accepted",
      message: "Your ride request has been accepted",
      data: { rideId: rideRequest.rideId, rideRequestId: rideRequest.id },
    });
  },

  async notifyRequestRejected(rideRequest) {
    await dispatch({
      userId: rideRequest.passengerId,
      type: "RIDE_REQUEST_REJECTED",
      title: "Request rejected",
      message: "Your ride request was not accepted",
      data: { rideId: rideRequest.rideId, rideRequestId: rideRequest.id },
    });
  },

  async notifyPaymentRequired(booking) {
    await dispatch({
      userId: booking.passengerId,
      type: "PAYMENT_REQUIRED",
      title: "Payment required",
      message: `Please complete payment of ₹${booking.totalAmount} to confirm your booking`,
      data: { bookingId: booking.id },
    });
  },

  async notifyPaymentSuccess(booking) {
    await dispatch({
      userId: booking.passengerId,
      type: "PAYMENT_SUCCESS",
      title: "Payment successful",
      message: "Your payment was successful and your booking is confirmed",
      data: { bookingId: booking.id },
    });
  },

  async notifyRideStarted(rideId) {
    const bookings = await bookingRepository.findConfirmedByRide(rideId);
    for (const booking of bookings) {
      await dispatch({
        userId: booking.passengerId,
        type: "RIDE_STARTED",
        title: "Ride started",
        message: `Your ride to ${booking.rideDestinationName} has started`,
        data: { rideId },
      });
    }
  },

  async notifyRideCompleted(rideId) {
    const bookings = await bookingRepository.findConfirmedByRide(rideId);
    for (const booking of bookings) {
      await dispatch({
        userId: booking.passengerId,
        type: "RIDE_COMPLETED",
        title: "Ride completed",
        message: `Your ride to ${booking.rideDestinationName} has been completed`,
        data: { rideId },
      });
    }
  },

  async notifyRideCancelled(rideId) {
    const [ride, bookings] = await Promise.all([
      rideRepository.findById(rideId),
      bookingRepository.findActiveByRide(rideId),
    ]);
    for (const booking of bookings) {
      await dispatch({
        userId: booking.passengerId,
        type: "RIDE_CANCELLED",
        title: "Ride cancelled",
        message: `The ride to ${ride.destinationName} was cancelled by the rider`,
        data: { rideId },
      });
    }
  },

  async notifyNewRating(rating) {
    await dispatch({
      userId: rating.revieweeId,
      type: "NEW_RATING",
      title: "New rating received",
      message: `You received a ${rating.score}-star rating`,
      data: { ratingId: rating.id, bookingId: rating.bookingId },
    });
  },

  async notifySafetyReportUpdated(report) {
    await dispatch({
      userId: report.reporterId,
      type: "SAFETY_REPORT_UPDATED",
      title: "Safety report update",
      message: `Your safety report status is now ${report.status}`,
      data: { safetyReportId: report.id },
    });
  },
};
