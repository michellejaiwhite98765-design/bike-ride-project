import { withTransaction } from "../config/db.js";
import { rideRepository } from "../repositories/ride.repository.js";
import { bookingRepository } from "../repositories/booking.repository.js";
import { ratingRepository } from "../repositories/rating.repository.js";
import { vehicleRepository } from "../repositories/vehicle.repository.js";
import { rideRequestRepository } from "../repositories/rideRequest.repository.js";
import { departureInstant } from "../utils/departure.js";
import { ApiError } from "../utils/ApiError.js";
import { assertRideTransition } from "../utils/stateMachine.js";
import { audit } from "../utils/audit.js";
import { env } from "../config/env.js";
import { scoreRide } from "./matching.service.js";
import { notificationService } from "./notification.service.js";
import { paymentService } from "./payment.service.js";
import { joinRadiusKmFor } from "./rideRequest.service.js";
import { fetchRoadRoute } from "./routing.service.js";

const OPEN_TRIP_MESSAGE = "Please complete or cancel your current trip before creating a new one";

function assertOwner(ride, userId) {
  if (ride.riderId !== userId) throw ApiError.forbidden("You do not own this ride");
}

/**
 * Adds the viewer-specific fields to a ride: their own request status, the
 * join radius, and the rider's phone number only once the viewer is the
 * rider or an accepted passenger (it isn't shared with every searcher).
 */
function personalize(ride, viewerId, myRequestStatus) {
  const canSeeContact = viewerId === ride.riderId || myRequestStatus === "ACCEPTED";
  return {
    ...ride,
    rider: ride.rider ? { ...ride.rider, phone: canSeeContact ? ride.rider.phone : null } : ride.rider,
    myRequestStatus: viewerId === ride.riderId ? null : myRequestStatus ?? null,
    joinRadiusKm: joinRadiusKmFor(ride),
  };
}

const ENDPOINT_FIELDS = ["sourceLatitude", "sourceLongitude", "destinationLatitude", "destinationLongitude"];

export const rideService = {
  async create(riderId, data) {
    const vehicle = await vehicleRepository.findById(data.vehicleId);
    if (!vehicle || vehicle.ownerId !== riderId) throw ApiError.badRequest("Vehicle not found");
    if (!vehicle.isActive) throw ApiError.badRequest("This vehicle has been removed. Please select another vehicle.");
    if (vehicle.verificationStatus !== "VERIFIED") {
      throw ApiError.badRequest("Vehicle must be verified before creating a ride");
    }
    // Vehicles created before seatCapacity existed (or reactivated ones) can
    // still have a null value in the DB - treat that the same way the
    // frontend already does elsewhere: default to 1 rather than letting
    // `N > null` (which JS coerces to `N > 0`) block every ride.
    const seatCapacity = vehicle.seatCapacity ?? 1;
    if (data.availableSeats > seatCapacity) {
      throw ApiError.badRequest(
        `This vehicle only has ${seatCapacity} passenger seat${seatCapacity === 1 ? "" : "s"} available`
      );
    }

    // One open trip at a time: a new ride is only allowed once the previous
    // one has been completed, cancelled or expired. Close any trip whose time
    // has long passed first, so an abandoned ride can't block the rider forever.
    await this.expireStaleRides();
    if (await rideRepository.findOpenByRider(riderId)) {
      throw ApiError.badRequest(OPEN_TRIP_MESSAGE);
    }

    const { cloneOfRideId, ...rideData } = data;
    let ride = await rideRepository.create(riderId, rideData);
    if (cloneOfRideId && !rideData.routePath) {
      // Only the rider's own ride, and only if the start/end are unchanged.
      const copied = await rideRepository.copyRouteFrom(cloneOfRideId, ride.id, riderId);
      if (copied) ride = await rideRepository.findById(ride.id);
    }
    // No road route from the app: look it up here, so passengers along the
    // way (not just near the straight start-end line) can find this ride.
    // In the background - creating the ride shouldn't wait on the routing
    // server; if it fails, the periodic backfill retries.
    if (!rideData.routePath) void this.ensureRoadRoute(ride);
    await audit(null, { userId: riderId, action: "RIDE_CREATED", entityType: "Ride", entityId: ride.id });
    return ride;
  },

  /** Saves the ride's road route from the routing service if it has none. Never throws. */
  async ensureRoadRoute(ride) {
    try {
      if (await rideRepository.hasRoutePath(ride.id)) return false;
      const path = await fetchRoadRoute(
        { latitude: ride.sourceLatitude, longitude: ride.sourceLongitude },
        { latitude: ride.destinationLatitude, longitude: ride.destinationLongitude }
      );
      if (!path) return false;
      await rideRepository.setRoutePath(ride.id, path);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Fills in road routes for open rides that don't have one yet (created
   * before routes were saved, or routing was down at the time). Runs with the
   * periodic sweep in server.js; one lookup at a time to stay polite to the
   * public routing server.
   */
  async backfillRoadRoutes(limit = 20) {
    const rides = await rideRepository.findOpenWithoutRoute(limit);
    let filled = 0;
    for (const ride of rides) {
      if (await this.ensureRoadRoute(ride)) filled += 1;
      await new Promise((resolve) => setTimeout(resolve, 1100));
    }
    return filled;
  },

  async getForViewer(rideId, viewerId) {
    const ride = await this.getById(rideId);
    const statuses = await rideRequestRepository.activeStatusByRideIds(viewerId, [rideId]);
    return personalize(ride, viewerId, statuses.get(rideId));
  },

  async getById(rideId) {
    const ride = await rideRepository.findById(rideId);
    if (!ride) throw ApiError.notFound("Ride not found");

    const [ratingAgg, numberOfRides] = await Promise.all([
      ratingRepository.aggregateForReviewee(ride.riderId),
      rideRepository.countCompletedByRider(ride.riderId),
    ]);
    ride.rider.rating = ratingAgg.avgScore ? Number(ratingAgg.avgScore.toFixed(2)) : null;
    ride.rider.numberOfRides = numberOfRides;

    return ride;
  },

  listMine(riderId) {
    return rideRepository.findByRider(riderId);
  },

  async update(userId, rideId, data) {
    const ride = await this.getById(rideId);
    assertOwner(ride, userId);
    if (!["DRAFT", "PUBLISHED"].includes(ride.status)) {
      throw ApiError.conflict("Ride can only be edited while it is a draft or published");
    }

    const { routePath, ...fields } = data;
    const endpointsChanged = ENDPOINT_FIELDS.some(
      (key) => fields[key] !== undefined && Number(fields[key]) !== Number(ride[key])
    );
    let updated = await rideRepository.update(rideId, fields);
    // Keep the stored road route in step with the endpoints: use the new one
    // if sent, and drop a stale one when the start/end moved without it.
    if (routePath !== undefined || endpointsChanged) {
      await rideRepository.setRoutePath(rideId, routePath ?? null);
      updated = await rideRepository.findById(rideId);
      if (!routePath) void this.ensureRoadRoute(updated);
    }
    await audit(null, { userId, action: "RIDE_UPDATED", entityType: "Ride", entityId: rideId });
    return updated;
  },

  /**
   * Closes rides that were never started and whose departure is more than
   * RIDE_EXPIRE_AFTER_MINUTES in the past: pending requests expire, any
   * bookings are cancelled (paid ones refunded) and passengers are told.
   * Runs periodically (see server.js) and before a rider creates a new trip.
   */
  async expireStaleRides() {
    const expired = await withTransaction(async (tx) => {
      const rides = await rideRepository.expireStale(env.rideExpiry.afterDepartureMinutes, env.timezoneOffsetMinutes, tx);
      for (const ride of rides) {
        ride.closedRequests = await rideRequestRepository.expirePendingForRide(ride.id, tx);
        ride.cancelledBookings = await bookingRepository.cancelAllForRide(ride.id, "Ride expired - it was never started", tx);
        for (const booking of ride.cancelledBookings) {
          await rideRequestRepository.updateStatus(booking.rideRequestId, "CANCELLED", tx);
        }
      }
      return rides;
    });

    for (const ride of expired) {
      for (const booking of ride.cancelledBookings) {
        if (booking.paymentStatus === "SUCCESS") await paymentService.refundPayment(booking.id);
      }
      await notificationService.notifyRideExpired(ride, [...ride.cancelledBookings, ...ride.closedRequests]);
      await audit(null, { action: "RIDE_EXPIRED", entityType: "Ride", entityId: ride.id });
    }
    return expired.length;
  },

  async publish(userId, rideId) {
    const ride = await this.getById(rideId);
    assertOwner(ride, userId);
    assertRideTransition(ride.status, "PUBLISHED");

    const vehicle = await vehicleRepository.findById(ride.vehicleId);
    if (!vehicle || vehicle.ownerId !== userId || !vehicle.isActive || vehicle.verificationStatus !== "VERIFIED") {
      throw ApiError.badRequest("A verified active vehicle is required before publishing this ride");
    }
    const updated = await rideRepository.update(rideId, { status: "PUBLISHED" });
    await audit(null, { userId, action: "RIDE_PUBLISHED", entityType: "Ride", entityId: rideId });
    return updated;
  },

  async cancel(userId, rideId, reason) {
    const ride = await this.getById(rideId);
    assertOwner(ride, userId);
    assertRideTransition(ride.status, "CANCELLED");

    const { updated, cancelledBookings, closedRequests } = await withTransaction(async (tx) => {
      const cancelled = await rideRepository.updateFlat(rideId, { status: "CANCELLED", cancelledAt: new Date() }, tx);
      const bookings = await bookingRepository.cancelAllForRide(rideId, "Ride cancelled by rider", tx);
      for (const booking of bookings) {
        await rideRequestRepository.updateStatus(booking.rideRequestId, "CANCELLED", tx);
      }
      const requests = await rideRequestRepository.expirePendingForRide(rideId, tx);
      return { updated: cancelled, cancelledBookings: bookings, closedRequests: requests };
    });

    // Passengers who already paid get their money back.
    for (const booking of cancelledBookings) {
      if (booking.paymentStatus === "SUCCESS") await paymentService.refundPayment(booking.id);
    }

    await audit(null, { userId, action: "RIDE_CANCELLED", entityType: "Ride", entityId: rideId, metadata: { reason } });
    await notificationService.notifyRideCancelled(ride, [...cancelledBookings, ...closedRequests]);
    return updated;
  },

  /**
   * Only the rider can start their ride, and only when it makes sense:
   * - no earlier than RIDE_EARLY_START_MINUTES before the scheduled departure
   * - with at least one confirmed (accepted, and paid if WITH_TIP) passenger
   * Starting closes the ride to new passengers: unanswered requests expire
   * and accepted-but-unpaid bookings are cancelled.
   */
  async start(userId, rideId) {
    const ride = await this.getById(rideId);
    assertOwner(ride, userId);
    assertRideTransition(ride.status, "STARTED");

    const earliestStart = departureInstant(ride.departureDate, ride.departureTime).getTime()
      - env.rideStart.earlyStartMinutes * 60 * 1000;
    if (Date.now() < earliestStart) {
      throw ApiError.conflict(
        `You can start this ride from ${env.rideStart.earlyStartMinutes} minutes before departure (${ride.departureTime}).`
      );
    }

    const confirmedCount = await bookingRepository.countConfirmedForRide(rideId);
    if (confirmedCount === 0) {
      throw ApiError.conflict("You need at least one confirmed passenger before starting. Accept a request first, or cancel the ride.");
    }

    const { updated, expiredRequests, cancelledBookings } = await withTransaction(async (tx) => {
      const expired = await rideRequestRepository.expirePendingForRide(rideId, tx);
      const cancelled = await bookingRepository.cancelUnpaidForRide(rideId, "Payment not completed before the ride started", tx);
      const started = await rideRepository.updateFlat(rideId, { status: "STARTED", startedAt: new Date() }, tx);
      return { updated: started, expiredRequests: expired, cancelledBookings: cancelled };
    });

    await audit(null, { userId, action: "RIDE_STARTED", entityType: "Ride", entityId: rideId });
    await notificationService.notifyRideStarted(rideId);
    await notificationService.notifyLeftBehind(ride, expiredRequests, cancelledBookings);
    return rideRepository.findById(updated.id);
  },

  async complete(userId, rideId) {
    const ride = await this.getById(rideId);
    assertOwner(ride, userId);
    assertRideTransition(ride.status, "COMPLETED");
    const updated = await rideRepository.update(rideId, { status: "COMPLETED", completedAt: new Date() });
    await audit(null, { userId, action: "RIDE_COMPLETED", entityType: "Ride", entityId: rideId });
    await notificationService.notifyRideCompleted(rideId);
    return updated;
  },

  async search(search, viewerId) {
    const pickupRadiusKm = search.radius || env.matching.pickupRadiusKm;
    const destinationRadiusKm = search.radius || env.matching.destinationRadiusKm;

    const candidates = await rideRepository.searchCandidates({
      ...search,
      date: search.date,
      time: search.time,
      includeFull: search.includeFull,
      timeWindowMinutes: env.matching.timeWindowMinutes,
      pickupRadiusM: pickupRadiusKm * 1000,
      destinationRadiusM: destinationRadiusKm * 1000,
      // A precise route search (no explicit radius) only lists rides the
      // passenger can actually join; an explicit radius (e.g. the home page's
      // "rides near me") stays a broad browse.
      joinRadii: search.radius
        ? null
        : {
            onRouteM: env.matching.joinRadiusOnRouteKm * 1000,
            passengerLocationM: env.matching.joinRadiusPassengerLocationKm * 1000,
          },
    });
    if (candidates.length === 0) return [];

    const rides = await rideRepository.findManyByIds(candidates.map((c) => c.id));
    const distanceById = new Map(candidates.map((c) => [c.id, c]));

    const riderIds = [...new Set(rides.map((r) => r.riderId))];
    const ratings = await ratingRepository.avgScoresByRevieweeIds(riderIds);
    const ratingByRiderId = new Map(ratings.map((r) => [r.revieweeId, r.avgScore]));

    const matchingConfig = { pickupRadiusKm, destinationRadiusKm, timeWindowMinutes: env.matching.timeWindowMinutes };

    const results = rides.map((ride) => {
      const distances = distanceById.get(ride.id);
      const { matchScore, matchPercentage, breakdown } = scoreRide({
        ride,
        distances,
        search,
        matchingConfig,
        riderRating: ratingByRiderId.get(ride.riderId) ?? null,
      });
      return {
        ...ride,
        distances: {
          sourceDistanceKm: Number(distances.sourceDistanceKm.toFixed(2)),
          destinationDistanceKm: Number(distances.destinationDistanceKm.toFixed(2)),
        },
        matchScore,
        matchPercentage,
        matchBreakdown: breakdown,
      };
    });

    results.sort((a, b) => b.matchScore - a.matchScore);
    const statuses = await rideRequestRepository.activeStatusByRideIds(viewerId, results.map((r) => r.id));
    return results.map((ride) => personalize(ride, viewerId, statuses.get(ride.id)));
  },
};
