import { rideRequestRepository } from "../repositories/rideRequest.repository.js";
import { rideRepository } from "../repositories/ride.repository.js";
import { bookingRepository } from "../repositories/booking.repository.js";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";
import { audit } from "../utils/audit.js";
import { notificationService } from "./notification.service.js";

// Two rides leaving within this many minutes of each other count as the same
// trip for a passenger (they can't physically take both).
export const OVERLAP_WINDOW_MINUTES = 120;

// Slack on "pickup comes before drop along the route", so a pickup/drop
// that are both right at the start (or a slightly zig-zagging road) aren't
// rejected as going the wrong way.
const DIRECTION_SLACK = 0.02;

/**
 * How far from the ride's route a passenger may be to join, based on the
 * ride's pickup preference: ON_ROUTE means the passenger meets the rider on
 * the road (a short walk), PASSENGER_LOCATION means the rider detours to them.
 */
export function joinRadiusKmFor(ride) {
  return ride.pickupPreference === "PASSENGER_LOCATION"
    ? env.matching.joinRadiusPassengerLocationKm
    : env.matching.joinRadiusOnRouteKm;
}

/**
 * Whether a passenger with this pickup (and, if given, drop) can join the
 * ride. Returns { ok, reason, message, pickupDistanceKm, dropDistanceKm, radiusKm }.
 */
async function checkJoin(ride, pickup, drop) {
  let radiusKm = joinRadiusKmFor(ride);
  const geometry = await rideRepository.joinGeometry(ride.id, pickup, drop);
  // Rides without a stored road route are measured against the straight line
  // between their endpoints, which can sit a little off the real road - give
  // those the wider of the two radii so passengers on the actual road aren't
  // wrongly turned away.
  if (geometry && !geometry.hasRoute) radiusKm = Math.max(radiusKm, env.matching.joinRadiusPassengerLocationKm);

  const km = (m) => (m == null ? null : Number((m / 1000).toFixed(1)));
  const result = {
    ok: true,
    reason: null,
    message: null,
    radiusKm,
    pickupDistanceKm: km(geometry?.pickupM),
    dropDistanceKm: km(geometry?.dropM),
  };
  if (!geometry) return result;

  const limitM = radiusKm * 1000;
  if (geometry.pickupM > limitM) {
    return {
      ...result,
      ok: false,
      reason: "PICKUP_TOO_FAR",
      message: `Your pickup point is ${result.pickupDistanceKm} km from this ride's route. This rider picks up passengers within ${radiusKm} km of their route.`,
    };
  }
  if (geometry.dropM != null && geometry.dropM > limitM) {
    return {
      ...result,
      ok: false,
      reason: "DROP_TOO_FAR",
      message: `Your drop point is ${result.dropDistanceKm} km from this ride's route. Choose a drop point within ${radiusKm} km of the route.`,
    };
  }
  if (geometry.dropFraction != null && geometry.pickupFraction > geometry.dropFraction + DIRECTION_SLACK) {
    return {
      ...result,
      ok: false,
      reason: "WRONG_DIRECTION",
      message: "Your drop point comes before your pickup on this ride's route - this ride is going the other way.",
    };
  }
  return result;
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

    // The rider only picks up people along their way.
    const join = await checkJoin(
      ride,
      { latitude: data.pickupLatitude, longitude: data.pickupLongitude },
      { latitude: data.dropLatitude, longitude: data.dropLongitude }
    );
    if (!join.ok) {
      throw ApiError.badRequest(join.message, {
        reason: join.reason,
        pickupDistanceKm: join.pickupDistanceKm,
        dropDistanceKm: join.dropDistanceKm,
        radiusKm: join.radiusKm,
      });
    }

    const overlapping = await bookingRepository.findOverlappingForPassenger(passengerId, rideId, OVERLAP_WINDOW_MINUTES);
    if (overlapping) {
      throw ApiError.conflict(
        `You already have a booking around this time (${overlapping.sourceName} → ${overlapping.destinationName} at ${overlapping.departureTime}). Cancel it before requesting another ride.`
      );
    }

    const rideRequest = await rideRequestRepository.create(rideId, passengerId, data);
    await audit(null, { userId: passengerId, action: "RIDE_REQUEST_CREATED", entityType: "RideRequest", entityId: rideRequest.id });
    await notificationService.notifyRequestCreated(rideRequest);
    return rideRequest;
  },

  /** Pre-check used by the app before the passenger fills in a request. */
  async joinCheck(rideId, { pickupLatitude, pickupLongitude, dropLatitude, dropLongitude }) {
    const ride = await rideRepository.findById(rideId);
    if (!ride) throw ApiError.notFound("Ride not found");
    const drop = dropLatitude != null && dropLongitude != null ? { latitude: dropLatitude, longitude: dropLongitude } : null;
    return checkJoin(ride, { latitude: pickupLatitude, longitude: pickupLongitude }, drop);
  },

  async listForRide(userId, rideId) {
    const ride = await rideRepository.findById(rideId);
    if (!ride) throw ApiError.notFound("Ride not found");
    if (ride.riderId !== userId) throw ApiError.forbidden("You do not own this ride");
    return rideRequestRepository.findByRide(rideId);
  },

  /** The current user's own active (REQUESTED/ACCEPTED) request for this ride, or null. Lets the passenger's own UI show/withdraw a pending request without exposing the owner-only full request list. */
  async getMine(passengerId, rideId) {
    return rideRequestRepository.findActiveByRideAndPassenger(rideId, passengerId);
  },
};
