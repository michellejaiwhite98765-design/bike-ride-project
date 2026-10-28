import { api } from "./api.js";

export const bookingService = {
  listMine() {
    return api.get("/bookings").then((res) => res.data);
  },
  getById(id) {
    return api.get(`/bookings/${id}`).then((res) => res.data);
  },
  // Boarding: the rider sends an OTP once they meet the passenger, the passenger enters it.
  sendPickupOtp(id) {
    return api.post(`/bookings/${id}/pickup-otp`).then((res) => res.data);
  },
  verifyPickup(id, otp) {
    return api.post(`/bookings/${id}/verify-pickup`, { otp }).then((res) => res.data);
  },
  // Drop-off: same again at the destination; confirming it releases the rider's payment.
  sendDropOtp(id) {
    return api.post(`/bookings/${id}/drop-otp`).then((res) => res.data);
  },
  verifyDrop(id, otp) {
    return api.post(`/bookings/${id}/verify-drop`, { otp }).then((res) => res.data);
  },
  cancel(id, reason) {
    return api.post(`/bookings/${id}/cancel`, { reason }).then((res) => res.data);
  },
};
