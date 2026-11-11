import { withTransaction } from "../config/db.js";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { rideRepository } from "../repositories/ride.repository.js";
import { rideRequestRepository } from "../repositories/rideRequest.repository.js";
import { bookingRepository } from "../repositories/booking.repository.js";
import { audit } from "../utils/audit.js";
import { notificationService } from "./notification.service.js";
import { paymentService } from "./payment.service.js";

/**
 * Shared clean-up for the ways a ride or a seat ends without the trip
 * happening, so seats, requests, bookings and refunds always line up:
 *
 *  - closeRide: the rider cancels, or the trip is cancelled automatically
 *    because it wasn't started RIDE_START_GRACE_MINUTES (15) after its start
 *    time. The rider is warned at RIDE_START_REMINDER_MINUTES (10). Every booking is cancelled,
 *    paid ones refunded, every open request closed, and everyone affected
 *    (booked passengers and those still waiting) is told.
 *  - dropUnpaidBookings: an accepted passenger didn't pay - by the payment
 *    deadline, or before the rider started. The seat goes back on the ride.
 *  - sweep: runs both on a timer (server.js).
 */
export const tripLifecycleService = {
  /**
   * @param status "CANCELLED" or "EXPIRED"
   * @param notStarted true when the system cancels a trip the rider didn't start on time
   */
  async closeRide(rideId, { status, reason, userId = null, notStarted = false }) {
    const { bookings, closedRequests, ride } = await withTransaction(async (tx) => {
      const locked = await rideRepository.lockForSeatUpdate(tx, rideId);
      if (!locked || !["DRAFT", "PUBLISHED"].includes(locked.status)) return { bookings: [], closedRequests: [], ride: null };
      const active = await bookingRepository.findActiveByRide(rideId, undefined, tx);
      const updated = await rideRepository.updateFlat(
        rideId,
        status === "CANCELLED" ? { status, cancelledAt: new Date() } : { status },
        tx
      );
      await bookingRepository.cancelAllForRide(rideId, reason, tx);
      const closed = await rideRequestRepository.closeOpenForRide(rideId, status === "EXPIRED" ? "EXPIRED" : "CANCELLED", tx);
      return { bookings: active, closedRequests: closed, ride: updated };
    });
    if (!ride) return null;

    const refunded = [];
    for (const booking of bookings.filter((b) => b.paymentStatus === "SUCCESS")) {
      await paymentService.refundPayment(booking.id);
      refunded.push(booking.passengerId);
    }

    const passengerIds = [...bookings.map((b) => b.passengerId), ...closedRequests.map((r) => r.passengerId)];
    await audit(null, {
      userId,
      action: status === "EXPIRED" ? "RIDE_EXPIRED" : "RIDE_CANCELLED",
      entityType: "Ride",
      entityId: rideId,
      metadata: { reason, notStarted, bookingsCancelled: bookings.length, refunds: refunded.length },
    });
    if (notStarted) await notificationService.notifyRideNotStarted(rideId, passengerIds, { refunded });
    else if (status === "EXPIRED") await notificationService.notifyRideExpired(rideId, passengerIds, { refunded });
    else await notificationService.notifyRideCancelled(rideId, passengerIds, { refunded });
    return ride;
  },

  /** Cancels unpaid (PAYMENT_PENDING) bookings and puts their seats back. Returns how many were dropped. */
  async dropUnpaidBookings(bookings, reason) {
    let dropped = 0;
    for (const booking of bookings) {
      const done = await withTransaction(async (tx) => {
        // Re-check under lock: the passenger may have just paid.
        await rideRepository.lockForSeatUpdate(tx, booking.rideId);
        const current = await bookingRepository.findById(booking.id, tx);
        if (!current || current.bookingStatus !== "PAYMENT_PENDING") return false;
        await bookingRepository.update(booking.id, { bookingStatus: "CANCELLED", cancelledAt: new Date(), cancelReason: reason }, tx);
        await rideRepository.incrementSeats(tx, booking.rideId, booking.seats);
        await rideRequestRepository.updateStatus(booking.rideRequestId, "CANCELLED", tx);
        return true;
      });
      if (!done) continue;
      dropped += 1;
      await audit(null, { action: "BOOKING_UNPAID_RELEASED", entityType: "Booking", entityId: booking.id, metadata: { reason } });
      await notificationService.notifyBookingDropped(booking, reason);
    }
    return dropped;
  },

  /** Warns about and cancels trips not started on time, and releases seats whose payment deadline passed. Never throws. */
  async sweep() {
    const c = env.lifecycle;
    const result = { cancelled: 0, reminded: 0, unpaidReleased: 0 };
    try {
      // Not started 15 minutes after the start time: cancel the trip.
      for (const rideId of await rideRepository.findOverdue(c.startGraceMinutes, c.timeZone)) {
        const reason = `Trip not started within ${c.startGraceMinutes} minutes of its start time`;
        if (await this.closeRide(rideId, { status: "CANCELLED", reason, notStarted: true })) result.cancelled += 1;
      }
      // 10 minutes late: warn the rider (once) that it's cancelled in 5 more.
      for (const rideId of await rideRepository.findStartReminderDue(c.startReminderMinutes, c.timeZone)) {
        if (await rideRepository.markStartReminderSent(rideId)) {
          await notificationService.notifyStartReminder(rideId, c.startGraceMinutes - c.startReminderMinutes);
          result.reminded += 1;
        }
      }
      const live = env.liveJoin.enabled ? env.liveJoin.paymentDeadlineMinutes : null;
      const overdue = await bookingRepository.findPaymentOverdue(c.paymentDeadlineMinutes, live);
      // Passengers who joined a moving trip have a shorter deadline.
      const pending = overdue.filter((b) => b.rideStatus !== "STARTED");
      const moving = overdue.filter((b) => b.rideStatus === "STARTED");
      result.unpaidReleased = await this.dropUnpaidBookings(pending, `payment wasn't completed within ${c.paymentDeadlineMinutes} minutes`);
      if (moving.length) {
        result.unpaidReleased += await this.dropUnpaidBookings(moving, `payment wasn't completed within ${live} minutes`);
      }
    } catch (err) {
      logger.warn(`Trip lifecycle sweep failed: ${err.message}`);
    }
    return result;
  },
};
