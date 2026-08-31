import { withTransaction } from "../config/db.js";
import { rideRepository } from "../repositories/ride.repository.js";
import { bookingRepository } from "../repositories/booking.repository.js";
import { ratingRepository } from "../repositories/rating.repository.js";
import { vehicleRepository } from "../repositories/vehicle.repository.js";
import { ApiError } from "../utils/ApiError.js";
import { assertRideTransition } from "../utils/stateMachine.js";
import { audit } from "../utils/audit.js";
import { env } from "../config/env.js";
import { scoreRide } from "./matching.service.js";
import { notificationService } from "./notification.service.js";

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
    if (data.availableSeats > vehicle.seatCapacity) {
      throw ApiError.badRequest(
        `This vehicle only has ${vehicle.seatCapacity} passenger seat${vehicle.seatCapacity === 1 ? "" : "s"} available`
      );
    }

    const ride = await rideRepository.create(riderId, data);
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
    const updated = await rideRepository.update(rideId, data);
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

  async search(search) {
    const pickupRadiusKm = search.radius || env.matching.pickupRadiusKm;
    const destinationRadiusKm = search.radius || env.matching.destinationRadiusKm;

    const candidates = await rideRepository.searchCandidates({
      ...search,
      date: search.date,
      time: search.time,
      timeWindowMinutes: env.matching.timeWindowMinutes,
      pickupRadiusM: pickupRadiusKm * 1000,
      destinationRadiusM: destinationRadiusKm * 1000,
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
    return results;
  },
};
