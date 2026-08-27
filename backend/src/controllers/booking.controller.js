import { bookingService } from "../services/booking.service.js";
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

  async cancel(req, res) {
    const booking = await bookingService.cancelBooking(req.user.id, req.params.id, req.body?.reason);
    ok(res, booking, "Booking cancelled");
  },
};
