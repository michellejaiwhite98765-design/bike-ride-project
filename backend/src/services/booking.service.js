import { withTransaction } from "../config/db.js";
import { env } from "../config/env.js";
import { rideRepository } from "../repositories/ride.repository.js";
import { rideRequestRepository } from "../repositories/rideRequest.repository.js";
import { bookingRepository } from "../repositories/booking.repository.js";
import { ApiError } from "../utils/ApiError.js";
import { assertRideRequestTransition, assertBookingTransition } from "../utils/stateMachine.js";
import { audit } from "../utils/audit.js";
import { notificationService } from "./notification.service.js";
import { paymentService } from "./payment.service.js";

/**
 * Accepting a request is the one place seats actually get reserved (spec section
 * 12/13). Everything happens inside a single transaction that takes a row lock on
 * the ride (`SELECT ... FOR UPDATE`) so two concurrent accepts on a ride with one
 * seat left can never both succeed - the second waits for the lock, re-reads the
 * now-decremented seat count, and fails cleanly instead of racing.
 */
export const bookingService = {
  async acceptRequest(userId, requestId) {
    const rideRequest = await rideRequestRepository.findById(requestId);
    if (!rideRequest) throw ApiError.notFound("Ride request not found");
    if (rideRequest.ride.riderId !== userId) throw ApiError.forbidden("You do not own this ride");
    assertRideRequestTransition(rideRequest.status, "ACCEPTED");

    const { booking, updatedRequest } = await withTransaction(async (tx) => {
      const lockedRide = await rideRepository.lockForSeatUpdate(tx, rideRequest.rideId);
      if (!lockedRide || lockedRide.status !== "PUBLISHED") {
        throw ApiError.conflict("Ride is no longer accepting requests");
      }
      if (lockedRide.availableSeats < rideRequest.seatsRequested) {
        throw ApiError.conflict("No seats are available for this ride");
      }

      await rideRepository.decrementSeats(tx, rideRequest.rideId, rideRequest.seatsRequested);

      const ride = rideRequest.ride;
      const isPaid = ride.rideType === "WITH_TIP";
      const tipAmount = isPaid ? Number(ride.tipAmount) * rideRequest.seatsRequested : 0;
      const platformFee = isPaid ? env.platformFeeFlat : 0;

      const newBooking = await bookingRepository.create(tx, {
        rideId: rideRequest.rideId,
        passengerId: rideRequest.passengerId,
        rideRequestId: rideRequest.id,
        seats: rideRequest.seatsRequested,
        tipAmount,
        platformFee,
        totalAmount: tipAmount + platformFee,
        bookingStatus: isPaid ? "PAYMENT_PENDING" : "CONFIRMED",
        paymentStatus: isPaid ? "PENDING" : "NOT_REQUIRED",
      });

      const newRequest = await rideRequestRepository.updateStatus(requestId, "ACCEPTED", tx);

      return { booking: newBooking, updatedRequest: newRequest };
    });

    await audit(null, { userId, action: "RIDE_REQUEST_ACCEPTED", entityType: "RideRequest", entityId: requestId });
    await notificationService.notifyRequestAccepted(updatedRequest);
    if (booking.paymentStatus === "PENDING") {
      await notificationService.notifyPaymentRequired(booking);
    }
    return booking;
  },

  async rejectRequest(userId, requestId) {
    const rideRequest = await rideRequestRepository.findById(requestId);
    if (!rideRequest) throw ApiError.notFound("Ride request not found");
    if (rideRequest.ride.riderId !== userId) throw ApiError.forbidden("You do not own this ride");
    assertRideRequestTransition(rideRequest.status, "REJECTED");

    const updated = await rideRequestRepository.updateStatus(requestId, "REJECTED");
    await audit(null, { userId, action: "RIDE_REQUEST_REJECTED", entityType: "RideRequest", entityId: requestId });
    await notificationService.notifyRequestRejected(updated);
    return updated;
  },

  async cancelRequest(userId, requestId) {
    const rideRequest = await rideRequestRepository.findById(requestId);
    if (!rideRequest) throw ApiError.notFound("Ride request not found");
    if (rideRequest.passengerId !== userId) throw ApiError.forbidden("You do not own this request");
    assertRideRequestTransition(rideRequest.status, "CANCELLED");

    return rideRequestRepository.updateStatus(requestId, "CANCELLED");
  },

  async cancelBooking(userId, bookingId, reason) {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) throw ApiError.notFound("Booking not found");
    if (booking.passengerId !== userId) throw ApiError.forbidden("You do not own this booking");
    if (["STARTED", "COMPLETED"].includes(booking.ride.status)) {
      throw ApiError.conflict("Cannot cancel a booking after the ride has started");
    }
    assertBookingTransition(booking.bookingStatus, "CANCELLED");

    await withTransaction(async (tx) => {
      await bookingRepository.update(
        bookingId,
        { bookingStatus: "CANCELLED", cancelledAt: new Date(), cancelReason: reason },
        tx
      );
      await rideRepository.incrementSeats(tx, booking.rideId, booking.seats);
      await rideRequestRepository.updateStatus(booking.rideRequestId, "CANCELLED", tx);
    });

    if (booking.paymentStatus === "SUCCESS") {
      await paymentService.refundPayment(bookingId);
    }

    await audit(null, { userId, action: "BOOKING_CANCELLED", entityType: "Booking", entityId: bookingId, metadata: { reason } });
    return bookingRepository.findById(bookingId);
  },

  getByPassenger(userId) {
    return bookingRepository.findByPassenger(userId);
  },

  async getById(userId, bookingId) {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) throw ApiError.notFound("Booking not found");
    if (booking.passengerId !== userId && booking.ride.riderId !== userId) {
      throw ApiError.forbidden("You do not have access to this booking");
    }
    return booking;
  },
};
