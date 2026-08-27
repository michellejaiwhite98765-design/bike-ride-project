import { rideRequestService } from "../services/rideRequest.service.js";
import { bookingService } from "../services/booking.service.js";
import { ok, created } from "../utils/apiResponse.js";

export const rideRequestController = {
  async create(req, res) {
    const rideRequest = await rideRequestService.create(req.user.id, req.params.rideId, req.body);
    created(res, rideRequest, "Ride request submitted");
  },

  async listForRide(req, res) {
    const requests = await rideRequestService.listForRide(req.user.id, req.params.rideId);
    ok(res, requests);
  },

  async accept(req, res) {
    const booking = await bookingService.acceptRequest(req.user.id, req.params.id);
    ok(res, booking, "Request accepted");
  },

  async reject(req, res) {
    const rideRequest = await bookingService.rejectRequest(req.user.id, req.params.id);
    ok(res, rideRequest, "Request rejected");
  },

  async cancel(req, res) {
    const rideRequest = await bookingService.cancelRequest(req.user.id, req.params.id);
    ok(res, rideRequest, "Request cancelled");
  },
};
