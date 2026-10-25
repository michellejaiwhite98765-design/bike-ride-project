import { withTransaction } from "../config/db.js";
import { rideRepository } from "../repositories/ride.repository.js";
import { bookingRepository } from "../repositories/booking.repository.js";
import { rideRequestRepository } from "../repositories/rideRequest.repository.js";
import { ratingRepository } from "../repositories/rating.repository.js";
import { vehicleRepository } from "../repositories/vehicle.repository.js";
import { ApiError } from "../utils/ApiError.js";
import { assertRideTransition } from "../utils/stateMachine.js";
import { audit } from "../utils/audit.js";
import { env } from "../config/env.js";
import { scoreRide } from "./matching.service.js";
import { notificationService } from "./notification.service.js";
import { fetchRoadRoute } from "./routing.service.js";
import { classifyPickup } from "../utils/pickupZone.js";

const OPEN_TRIP_MESSAGE = "Please complete or cancel your current trip before creating a new one";

function assertOwner(ride, userId) {
  if (ride.riderId !== userId) throw ApiError.forbidden("You do not own this ride");
}

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
    // one has been completed or cancelled.
    if (await rideRepository.findOpenByRider(riderId)) {
      throw ApiError.badRequest(OPEN_TRIP_MESSAGE);
    }

    const ride = await rideRepository.create(riderId, data);
    // No road route sent by the app: look it up in the background so
    // passengers along the real road can find this ride.
    if (!data.routePath) void this.ensureRoadRoute(ride);
    await audit(null, { userId: riderId, action: "RIDE_CREATED", entityType: "Ride", entityId: ride.id });
    return ride;
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
    const endpointsMoved = ["sourceLatitude", "sourceLongitude", "destinationLatitude", "destinationLongitude"].some(
      (key) => fields[key] !== undefined && Number(fields[key]) !== Number(ride[key])
    );
    let updated = await rideRepository.update(rideId, fields);
    // Keep the saved road route in step with the start/end.
    if (routePath || endpointsMoved) {
      await rideRepository.setRoutePath(rideId, routePath ?? null);
      if (!routePath) void this.ensureRoadRoute(updated);
      updated = await rideRepository.findById(rideId);
    }
    await audit(null, { userId, action: "RIDE_UPDATED", entityType: "Ride", entityId: rideId });
    return updated;
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

    const updated = await withTransaction(async (tx) => {
      const cancelled = await rideRepository.updateFlat(rideId, { status: "CANCELLED", cancelledAt: new Date() }, tx);
      await bookingRepository.cancelAllForRide(rideId, "Ride cancelled by rider", tx);
      return cancelled;
    });

    await audit(null, { userId, action: "RIDE_CANCELLED", entityType: "Ride", entityId: rideId, metadata: { reason } });
    await notificationService.notifyRideCancelled(rideId);
    return updated;
  },

  async start(userId, rideId) {
    const ride = await this.getById(rideId);
    assertOwner(ride, userId);
    assertRideTransition(ride.status, "STARTED");
    const updated = await rideRepository.update(rideId, { status: "STARTED", startedAt: new Date() });
    await audit(null, { userId, action: "RIDE_STARTED", entityType: "Ride", entityId: rideId });
    await notificationService.notifyRideStarted(rideId);
    return updated;
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

  async search(search, userId = null) {
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
      // A route search (no explicit radius) uses each ride's pickup zones;
      // an explicit radius (home page "near me") is a plain browse.
      zones: search.radius ? null : env.pickupZone,
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

    // Route search: tell the passenger, per ride, whether their pickup is on
    // the rider's route or needs a paid detour (and how much extra tip).
    if (!search.radius) {
      const pickup = { latitude: search.sourceLatitude, longitude: search.sourceLongitude };
      const drop = { latitude: search.destinationLatitude, longitude: search.destinationLongitude };
      for (const result of results) {
        const geometry = await rideRepository.pickupGeometry(result.id, pickup, drop);
        if (geometry) result.pickupZone = classifyPickup(geometry);
      }
    }

    // So the app can show "Requested" on rides the passenger already asked to join.
    if (userId) {
      const mine = await rideRequestRepository.findActiveByPassengerForRides(userId, results.map((r) => r.id));
      const byRide = new Map(mine.map((rr) => [rr.rideId, { id: rr.id, status: rr.status }]));
      for (const result of results) result.myRequest = byRide.get(result.id) ?? null;
    }

    results.sort((a, b) => b.matchScore - a.matchScore);
    return results;
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
   * Saves road routes for open rides that don't have one (created before
   * routes were saved, or routing was down). Runs periodically from
   * server.js, one lookup at a time to stay polite to the routing server.
   */
  async backfillRoadRoutes(limit = 20) {
    let filled = 0;
    for (const ride of await rideRepository.findOpenWithoutRoute(limit)) {
      if (await this.ensureRoadRoute(ride)) filled += 1;
      await new Promise((resolve) => setTimeout(resolve, 1100));
    }
    return filled;
  },
};
