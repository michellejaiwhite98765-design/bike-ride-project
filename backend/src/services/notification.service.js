import { rideRepository } from "../repositories/ride.repository.js";
import { bookingRepository } from "../repositories/booking.repository.js";
import { notificationRepository } from "../repositories/notification.repository.js";
import { logger } from "../config/logger.js";
import { emitToUser } from "../realtime/io.js";

// Single fan-in point for every notification. In-app only for this MVP; email/push
// channels can be added here later without touching the call sites below.
// Also pushes the same row over the user's Socket.IO room (if connected) so
// the bell badge and a toast update live instead of only on next page load;
// the DB write is still the source of truth - the socket emit is best-effort.
async function dispatch({ userId, type, title, message, data }) {
  try {
    const notification = await notificationRepository.create({ userId, type, title, message, data });
    emitToUser(userId, "notification:new", notification);
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

  /** Passengers whose request/booking was closed because the rider started without them. */
  async notifyLeftBehind(ride, expiredRequests, cancelledBookings) {
    const message = `The ride to ${ride.destinationName} has already started, so your request was closed. Please find another ride.`;
    for (const { passengerId } of [...expiredRequests, ...cancelledBookings]) {
      await dispatch({
        userId: passengerId,
        type: "RIDE_CANCELLED",
        title: "Ride left without you",
        message,
        data: { rideId: ride.id },
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

  /** `bookings` are the ones the cancellation just closed (see bookingRepository.cancelAllForRide). */
  async notifyRideCancelled(ride, bookings) {
    for (const booking of bookings) {
      await dispatch({
        userId: booking.passengerId,
        type: "RIDE_CANCELLED",
        title: "Ride cancelled",
        message: `The ride to ${ride.destinationName} was cancelled by the rider${booking.paymentStatus === "SUCCESS" ? ". Your payment has been refunded." : ""}`,
        data: { rideId: ride.id },
      });
    }
  },

  async notifyRideExpired(ride, bookings) {
    for (const booking of bookings) {
      await dispatch({
        userId: booking.passengerId,
        type: "RIDE_CANCELLED",
        title: "Ride didn't happen",
        message: `The ride to ${ride.destinationName} was never started, so it has been closed${booking.paymentStatus === "SUCCESS" ? " and your payment refunded" : ""}.`,
        data: { rideId: ride.id },
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
