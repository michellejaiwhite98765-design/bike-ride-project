import { api } from "./api.js";

export const bookingService = {
  listMine() {
    return api.get("/bookings").then((res) => res.data);
  },
  getById(id) {
    return api.get(`/bookings/${id}`).then((res) => res.data);
  },
  cancel(id, reason) {
    return api.post(`/bookings/${id}/cancel`, { reason }).then((res) => res.data);
  },
};
