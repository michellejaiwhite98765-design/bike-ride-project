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
      message: `Your payment of ₹${booking.totalAmount} was successful and your booking is confirmed`,
      data: { bookingId: booking.id },
    });
    // Tell the rider the seat is now paid for and confirmed.
    const ride = booking.ride?.riderId ? booking.ride : await rideRepository.findById(booking.rideId);
    if (ride?.riderId) {
      await dispatch({
        userId: ride.riderId,
        type: "PAYMENT_SUCCESS",
        title: "Passenger paid",
        message: `A passenger paid ₹${booking.totalAmount} for your ride to ${ride.destinationName}. Their seat is confirmed`,
        data: { rideId: ride.id, bookingId: booking.id },
      });
    }
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

  /**
   * Tells every affected passenger (booked or still waiting on a request) the
   * ride is off. The caller collects `passengerIds` before cancelling, since
   * afterwards nothing on the ride is active any more.
   */
  async notifyRideCancelled(rideId, passengerIds, { refunded = [] } = {}) {
    const ride = await rideRepository.findById(rideId);
    for (const passengerId of new Set(passengerIds)) {
      await dispatch({
        userId: passengerId,
        type: "RIDE_CANCELLED",
        title: "Ride cancelled",
        message: `The ride to ${ride.destinationName} was cancelled by the rider${refunded.includes(passengerId) ? ". Your payment is being refunded" : ""}`,
        data: { rideId },
      });
    }
  },

  async notifyRideExpired(rideId, passengerIds, { refunded = [] } = {}) {
    const ride = await rideRepository.findById(rideId);
    await dispatch({
      userId: ride.riderId,
      type: "RIDE_EXPIRED",
      title: "Trip expired",
      message: `Your trip to ${ride.destinationName} was never started and has expired`,
      data: { rideId },
    });
    for (const passengerId of new Set(passengerIds)) {
      await dispatch({
        userId: passengerId,
        type: "RIDE_EXPIRED",
        title: "Ride expired",
        message: `The ride to ${ride.destinationName} never started and has expired${refunded.includes(passengerId) ? ". Your payment is being refunded" : ""}`,
        data: { rideId },
      });
    }
  },

  /** A passenger withdrew their request or cancelled their seat - tell the rider. */
  async notifyPassengerLeft(rideId, passengerName, { wasAccepted }) {
    const ride = await rideRepository.findById(rideId);
    await dispatch({
      userId: ride.riderId,
      type: "RIDE_REQUEST_CANCELLED",
      title: wasAccepted ? "Passenger cancelled" : "Request withdrawn",
      message: wasAccepted
        ? `${passengerName} cancelled their seat on your ride to ${ride.destinationName}. The seat is open again`
        : `${passengerName} withdrew their request for your ride to ${ride.destinationName}`,
      data: { rideId },
    });
  },

  /** A booking was dropped because it wasn't paid in time (deadline passed, or the ride started). */
  async notifyBookingDropped(booking, reason) {
    const ride = await rideRepository.findById(booking.rideId);
    await dispatch({
      userId: booking.passengerId,
      type: "BOOKING_CANCELLED",
      title: "Booking cancelled",
      message: `Your seat on the ride to ${ride.destinationName} was released: ${reason}`,
      data: { rideId: booking.rideId, bookingId: booking.id },
    });
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
