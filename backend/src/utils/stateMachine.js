import { ApiError } from "./ApiError.js";

const RIDE_TRANSITIONS = {
  DRAFT: ["PUBLISHED", "CANCELLED"],
  PUBLISHED: ["STARTED", "CANCELLED", "EXPIRED"],
  STARTED: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
  EXPIRED: [],
};

const RIDE_REQUEST_TRANSITIONS = {
  REQUESTED: ["ACCEPTED", "REJECTED", "CANCELLED", "EXPIRED"],
  ACCEPTED: ["CANCELLED"],
  REJECTED: [],
  CANCELLED: [],
  EXPIRED: [],
};

const BOOKING_TRANSITIONS = {
  PAYMENT_PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["CANCELLED"],
  CANCELLED: [],
};

function assertTransition(map, current, next, label) {
  const allowed = map[current] || [];
  if (!allowed.includes(next)) {
    throw ApiError.conflict(`Cannot transition ${label} from ${current} to ${next}`);
  }
}

export const assertRideTransition = (current, next) => assertTransition(RIDE_TRANSITIONS, current, next, "ride");
export const assertRideRequestTransition = (current, next) =>
  assertTransition(RIDE_REQUEST_TRANSITIONS, current, next, "ride request");
export const assertBookingTransition = (current, next) =>
  assertTransition(BOOKING_TRANSITIONS, current, next, "booking");
