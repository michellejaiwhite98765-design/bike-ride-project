import { bookingService } from "../services/booking.service.js";
import { boardingService } from "../services/boarding.service.js";
import { ok } from "../utils/apiResponse.js";

export const bookingController = {
  async listMine(req, res) {
    const bookings = await bookingService.getByPassenger(req.user.id);
    ok(res, bookings);
  },

  async getById(req, res) {
    const booking = await bookingService.getById(req.user.id, req.params.id);
    ok(res, booking);
  },

  async sendPickupOtp(req, res) {
    const result = await boardingService.sendPickupOtp(req.user.id, req.params.id);
    ok(res, result, "Pickup OTP sent to the passenger");
  },

  async sendDropOtp(req, res) {
    const result = await boardingService.sendDropOtp(req.user.id, req.params.id);
    ok(res, result, "Drop-off OTP sent to the passenger");
  },

  async verifyDrop(req, res) {
    const booking = await boardingService.verifyDropOtp(req.user.id, req.params.id, req.body.otp);
    ok(res, booking, "Drop-off confirmed");
  },

  async verifyPickup(req, res) {
    const booking = await boardingService.verifyPickupOtp(req.user.id, req.params.id, req.body.otp);
    ok(res, booking, "You're on board");
  },

  async cancel(req, res) {
    const booking = await bookingService.cancelBooking(req.user.id, req.params.id, req.body?.reason);
    ok(res, booking, "Booking cancelled");
  },
};
