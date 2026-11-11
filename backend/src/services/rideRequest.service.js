import { rideRequestRepository } from "../repositories/rideRequest.repository.js";
import { rideRepository } from "../repositories/ride.repository.js";
import { bookingRepository } from "../repositories/booking.repository.js";
import { ApiError } from "../utils/ApiError.js";
import { audit } from "../utils/audit.js";
import { notificationService } from "./notification.service.js";
import { classifyPickup } from "../utils/pickupZone.js";
import { bookingService } from "./booking.service.js";
import { env } from "../config/env.js";
import { liveJoinService } from "./liveJoin.service.js";

async function classifyForRide(rideId, pickup, drop) {
  const geometry = await rideRepository.pickupGeometry(rideId, pickup, drop);
  if (!geometry) throw ApiError.notFound("Ride not found");
  return classifyPickup(geometry);
}

export const rideRequestService = {
  async create(passengerId, rideId, data) {
    const ride = await rideRepository.findById(rideId);
    if (!ride) throw ApiError.notFound("Ride not found");
    if (!["PUBLISHED", "STARTED"].includes(ride.status)) throw ApiError.conflict("This ride is not open for requests");
    if (ride.riderId === passengerId) throw ApiError.badRequest("You cannot request your own ride");
    if (data.seatsRequested > ride.availableSeats) {
      throw ApiError.conflict("Requested seats exceed the seats available on this ride");
    }

    const duplicate = await rideRequestRepository.findActiveByRideAndPassenger(rideId, passengerId);
    if (duplicate) throw ApiError.conflict("You already have an active request for this ride");

    // Two-zone pickup (utils/pickupZone.js): on the rider's route, a detour
    // the passenger pays an extra tip for, or too far to join.
    const zone = await classifyForRide(
      rideId,
      { latitude: data.pickupLatitude, longitude: data.pickupLongitude },
      { latitude: data.dropLatitude, longitude: data.dropLongitude }
    );
    if (zone.zone === "TOO_FAR") throw ApiError.badRequest(zone.message, zone);

    // Trip already under way: only while the rider is less than half way and
    // hasn't passed the pickup (services/liveJoin.service.js).
    const started = ride.status === "STARTED";
    let live = null;
    if (started) {
      live = await liveJoinService.check(ride, { latitude: data.pickupLatitude, longitude: data.pickupLongitude });
      if (!live.allowed) throw ApiError.conflict(live.message, live);
    }

    const rideRequest = await rideRequestRepository.create(rideId, passengerId, {
      ...data,
      pickupZone: zone.zone,
      pickupDistanceKm: zone.pickupDistanceKm,
      extraTip: zone.extraTip,
    });
    await audit(null, { userId: passengerId, action: "RIDE_REQUEST_CREATED", entityType: "RideRequest", entityId: rideRequest.id, metadata: { pickupZone: zone.zone, extraTip: zone.extraTip } });

    // The rider is driving: a join on a moving trip always waits for them to
    // accept it, so no stop is added without their say.
    if (started || !env.lifecycle.autoAcceptRequests) {
      await notificationService.notifyRequestCreated(rideRequest, live);
      return rideRequest;
    }

    // Auto-accept: reserve the seat now and tell the driver the passenger joined.
    try {
      const full = await rideRequestRepository.findById(rideRequest.id);
      await bookingService.reserveSeat(full, { actorId: passengerId, auto: true });
    } catch (err) {
      // Seat taken by someone else a moment earlier, or the ride closed:
      // don't leave a pending request behind.
      await rideRequestRepository.updateStatus(rideRequest.id, "CANCELLED").catch(() => {});
      throw err;
    }
    return this.getMine(passengerId, rideId);
  },

  /**
   * Pre-check for the app before a request is sent: which zone a pickup (and
   * optional drop) falls in, and the extra tip if it's a detour.
   */
  async joinCheck(rideId, { pickupLatitude, pickupLongitude, dropLatitude, dropLongitude }) {
    const drop = dropLatitude != null && dropLongitude != null ? { latitude: dropLatitude, longitude: dropLongitude } : null;
    const zone = await classifyForRide(rideId, { latitude: pickupLatitude, longitude: pickupLongitude }, drop);
    const ride = await rideRepository.findById(rideId);
    if (ride?.status === "STARTED") {
      zone.live = await liveJoinService.check(ride, { latitude: pickupLatitude, longitude: pickupLongitude });
    }
    return zone;
  },

  async listForRide(userId, rideId) {
    const ride = await rideRepository.findById(rideId);
    if (!ride) throw ApiError.notFound("Ride not found");
    if (ride.riderId !== userId) throw ApiError.forbidden("You do not own this ride");
    return rideRequestRepository.findByRide(rideId);
  },

  /** The current user's own active (REQUESTED/ACCEPTED) request for this ride, or null. Lets the passenger's own UI show/withdraw a pending request without exposing the owner-only full request list. */
  async getMine(passengerId, rideId) {
    const request = await rideRequestRepository.findActiveByRideAndPassenger(rideId, passengerId);
    // Once accepted, include the booking so the ride page can offer "Pay"
    // or show that the seat is paid.
    if (request?.status === "ACCEPTED") {
      const booking = await bookingRepository.findByRideRequestId(request.id);
      if (booking) {
        request.booking = {
          id: booking.id,
          bookingStatus: booking.bookingStatus,
          paymentStatus: booking.paymentStatus,
          totalAmount: booking.totalAmount,
          boardingStatus: booking.boardingStatus,
        };
      }
    }
    return request;
  },
};
