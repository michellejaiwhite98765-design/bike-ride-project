import { rideRequestRepository } from "../repositories/rideRequest.repository.js";
import { rideRepository } from "../repositories/ride.repository.js";
import { ApiError } from "../utils/ApiError.js";
import { audit } from "../utils/audit.js";
import { notificationService } from "./notification.service.js";

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

    const rideRequest = await rideRequestRepository.create(rideId, passengerId, data);
    await audit(null, { userId: passengerId, action: "RIDE_REQUEST_CREATED", entityType: "RideRequest", entityId: rideRequest.id });
    await notificationService.notifyRequestCreated(rideRequest);
    return rideRequest;
  },

  async listForRide(userId, rideId) {
    const ride = await rideRepository.findById(rideId);
    if (!ride) throw ApiError.notFound("Ride not found");
    if (ride.riderId !== userId) throw ApiError.forbidden("You do not own this ride");
    return rideRequestRepository.findByRide(rideId);
  },
};
