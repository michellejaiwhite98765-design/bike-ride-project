import { rideRequestRepository } from "../repositories/rideRequest.repository.js";
import { rideRepository } from "../repositories/ride.repository.js";
import { bookingRepository } from "../repositories/booking.repository.js";
import { ApiError } from "../utils/ApiError.js";
import { audit } from "../utils/audit.js";
import { notificationService } from "./notification.service.js";
import { classifyPickup } from "../utils/pickupZone.js";

async function classifyForRide(rideId, pickup, drop) {
  const geometry = await rideRepository.pickupGeometry(rideId, pickup, drop);
  if (!geometry) throw ApiError.notFound("Ride not found");
  return classifyPickup(geometry);
}

export const rideRequestService = {
  async create(passengerId, rideId, data) {
    const ride = await rideRepository.findById(rideId);
    if (!ride) throw ApiError.notFound("Ride not found");
    if (ride.status !== "PUBLISHED") throw ApiError.conflict("This ride is not open for requests");
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

    const rideRequest = await rideRequestRepository.create(rideId, passengerId, {
      ...data,
      pickupZone: zone.zone,
      pickupDistanceKm: zone.pickupDistanceKm,
      extraTip: zone.extraTip,
    });
    await audit(null, { userId: passengerId, action: "RIDE_REQUEST_CREATED", entityType: "RideRequest", entityId: rideRequest.id, metadata: { pickupZone: zone.zone, extraTip: zone.extraTip } });
    await notificationService.notifyRequestCreated(rideRequest);
    return rideRequest;
  },

  /**
   * Pre-check for the app before a request is sent: which zone a pickup (and
   * optional drop) falls in, and the extra tip if it's a detour.
   */
  async joinCheck(rideId, { pickupLatitude, pickupLongitude, dropLatitude, dropLongitude }) {
    const drop = dropLatitude != null && dropLongitude != null ? { latitude: dropLatitude, longitude: dropLongitude } : null;
    return classifyForRide(rideId, { latitude: pickupLatitude, longitude: pickupLongitude }, drop);
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
        };
      }
    }
    return request;
  },
};
