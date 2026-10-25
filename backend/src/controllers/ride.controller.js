import { rideService } from "../services/ride.service.js";
import { ok, created } from "../utils/apiResponse.js";
import { bookingRepository } from "../repositories/booking.repository.js";
import { rideTrackingRepository } from "../repositories/rideTracking.repository.js";
import { locationStore } from "../realtime/locationStore.js";
import { ApiError } from "../utils/ApiError.js";

export const rideController = {
  async create(req, res) {
    const ride = await rideService.create(req.user.id, req.body);
    created(res, ride, "Ride created as draft");
  },

  async getById(req, res) {
    const ride = await rideService.getById(req.params.id);
    ok(res, ride);
  },

  async listMine(req, res) {
    const rides = await rideService.listMine(req.user.id);
    ok(res, rides);
  },

  async update(req, res) {
    const ride = await rideService.update(req.user.id, req.params.id, req.body);
    ok(res, ride, "Ride updated");
  },

  async publish(req, res) {
    const ride = await rideService.publish(req.user.id, req.params.id);
    ok(res, ride, "Ride published");
  },

  async cancel(req, res) {
    const ride = await rideService.cancel(req.user.id, req.params.id, req.body?.reason);
    ok(res, ride, "Ride cancelled");
  },

  async start(req, res) {
    const ride = await rideService.start(req.user.id, req.params.id);
    ok(res, ride, "Ride started");
  },

  async complete(req, res) {
    const ride = await rideService.complete(req.user.id, req.params.id);
    ok(res, ride, "Ride completed");
  },

  async search(req, res) {
    const results = await rideService.search(req.validatedQuery);
    ok(res, results);
  },

  async liveLocation(req, res) {
    const ride = await rideService.getById(req.params.id);
    const isOwner = ride.riderId === req.user.id;
    if (!isOwner) {
      const isPassenger = await bookingRepository.hasConfirmedForRide(ride.id, req.user.id);
      if (!isPassenger) throw ApiError.forbidden("Not authorized for this ride");
    }
    const allLocations = locationStore.getAllForRide(ride.id);
    const userLocation = locationStore.get(ride.id, req.user.id);
    if (Object.keys(allLocations).length > 0) {
      return ok(res, { locations: allLocations, myLocation: userLocation });
    }
    const lastPing = await rideTrackingRepository.latestByRide(ride.id);
    ok(res, { locations: lastPing ? { [lastPing.riderId]: lastPing } : {}, myLocation: null });
  },
};
