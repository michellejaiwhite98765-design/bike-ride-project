import { api } from "./api.js";

export const paymentService = {
  createOrder(bookingId) {
    return api.post("/payments/orders", { bookingId }).then((res) => res.data);
  },
  verify(payload) {
    return api.post("/payments/verify", payload).then((res) => res.data);
  },
};
