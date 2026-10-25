import { describe, it, expect } from "@jest/globals";
import { request, app, registerUser, createVehicle, createPublishedRide } from "./helpers.js";
import { pool } from "../src/config/db.js";
import { tripLifecycleService } from "../src/services/tripLifecycle.service.js";

const pickupDrop = {
  pickupName: "Pickup", pickupLatitude: 13.1147, pickupLongitude: 80.1,
  dropName: "Drop", dropLatitude: 13.0827, dropLongitude: 80.2707, seatsRequested: 1,
};
const auth = (user) => ({ Authorization: `Bearer ${user.token}` });

async function rideWith(overrides = {}) {
  const rider = await registerUser();
  const vehicle = await createVehicle(rider.token);
  // Bikes default to one passenger seat; some tests need two.
  if ((overrides.availableSeats ?? 1) > 1) {
    await pool.query('UPDATE "vehicles" SET "seat_capacity" = $1 WHERE "id" = $2', [overrides.availableSeats, vehicle.id]);
  }
  const ride = await createPublishedRide(rider.token, vehicle.id, overrides);
  return { rider, ride };
}
async function requestJoin(ride, passenger) {
  const res = await request(app).post(`/api/rides/${ride.id}/requests`).set(auth(passenger)).send(pickupDrop);
  expect(res.status).toBe(201);
  return res.body.data;
}
const accept = (rider, requestId) => request(app).put(`/api/ride-requests/${requestId}/accept`).set(auth(rider));
const getRide = async (user, rideId) => (await request(app).get(`/api/rides/${rideId}`).set(auth(user))).body.data;
const getBooking = async (user, bookingId) => (await request(app).get(`/api/bookings/${bookingId}`).set(auth(user))).body.data;
async function notificationTypes(user) {
  const data = (await request(app).get("/api/notifications").set(auth(user))).body.data;
  return (data.items ?? data).map((n) => n.type);
}
const createOrder = (passenger, bookingId) => request(app).post("/api/payments/orders").set(auth(passenger)).send({ bookingId });
const verify = (passenger, bookingId, order) =>
  request(app).post("/api/payments/verify").set(auth(passenger)).send({
    bookingId, providerOrderId: order.body.data.orderId,
    providerPaymentId: order.body.data.providerPaymentId, signature: order.body.data.mockSignature,
  });
const pay = async (passenger, bookingId) => verify(passenger, bookingId, await createOrder(passenger, bookingId));

describe("Gap 1 - withdrawing an accepted request", () => {
  it("gives the seat back, cancels the booking and tells the rider", async () => {
    const { rider, ride } = await rideWith({ availableSeats: 1 });
    const passenger = await registerUser();
    const req = await requestJoin(ride, passenger);
    const booking = (await accept(rider, req.id)).body.data;
    expect((await getRide(rider, ride.id)).availableSeats).toBe(0);

    const res = await request(app).put(`/api/ride-requests/${req.id}/cancel`).set(auth(passenger));
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("CANCELLED");
    expect((await getRide(rider, ride.id)).availableSeats).toBe(1);
    expect((await getBooking(passenger, booking.id)).bookingStatus).toBe("CANCELLED");
    expect(await notificationTypes(rider)).toContain("RIDE_REQUEST_CANCELLED");

    // The freed seat can go to someone else.
    const other = await registerUser();
    expect((await accept(rider, (await requestJoin(ride, other)).id)).status).toBe(200);
  });

  it("withdrawing a pending request tells the rider too", async () => {
    const { rider, ride } = await rideWith();
    const passenger = await registerUser();
    const req = await requestJoin(ride, passenger);
    expect((await request(app).put(`/api/ride-requests/${req.id}/cancel`).set(auth(passenger))).status).toBe(200);
    expect(await notificationTypes(rider)).toContain("RIDE_REQUEST_CANCELLED");
  });
});

describe("Gap 2 - rider cancels the ride", () => {
  it("refunds paid bookings, closes pending requests and notifies everyone", async () => {
    const { rider, ride } = await rideWith({ availableSeats: 2, rideType: "WITH_TIP", tipAmount: 50 });
    const paidPassenger = await registerUser();
    const waitingPassenger = await registerUser();
    const booking = (await accept(rider, (await requestJoin(ride, paidPassenger)).id)).body.data;
    expect((await pay(paidPassenger, booking.id)).status).toBe(200);
    const pending = await requestJoin(ride, waitingPassenger);

    const res = await request(app).post(`/api/rides/${ride.id}/cancel`).set(auth(rider)).send({ reason: "Bike trouble" });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("CANCELLED");

    const after = await getBooking(paidPassenger, booking.id);
    expect(after.bookingStatus).toBe("CANCELLED");
    expect(after.paymentStatus).toBe("REFUNDED");
    const mine = (await request(app).get(`/api/rides/${ride.id}/requests/mine`).set(auth(waitingPassenger))).body.data;
    expect(mine).toBeNull();
    const { rows } = await pool.query('SELECT "status" FROM "ride_requests" WHERE "id" = $1', [pending.id]);
    expect(rows[0].status).toBe("CANCELLED");
    expect(await notificationTypes(paidPassenger)).toContain("RIDE_CANCELLED");
    expect(await notificationTypes(waitingPassenger)).toContain("RIDE_CANCELLED");
  });
});

describe("Gap 3 - starting with an unpaid passenger", () => {
  it("releases the unpaid booking, and a late payment is refunded instead of restoring it", async () => {
    const { rider, ride } = await rideWith({ availableSeats: 1, rideType: "WITH_TIP", tipAmount: 50 });
    const passenger = await registerUser();
    const booking = (await accept(rider, (await requestJoin(ride, passenger)).id)).body.data;
    expect(booking.bookingStatus).toBe("PAYMENT_PENDING");
    // The passenger opened the payment screen but hadn't finished paying.
    const order = await createOrder(passenger, booking.id);

    const start = await request(app).post(`/api/rides/${ride.id}/start`).set(auth(rider));
    expect(start.status).toBe(200);
    expect(start.body.data.releasedUnpaid).toBe(1);
    expect((await getBooking(passenger, booking.id)).bookingStatus).toBe("CANCELLED");
    expect(await notificationTypes(passenger)).toContain("BOOKING_CANCELLED");

    // Paying now is refunded, and doesn't bring the released seat back.
    const late = await verify(passenger, booking.id, order);
    expect(late.status).toBe(409);
    const after = await getBooking(passenger, booking.id);
    expect(after.bookingStatus).toBe("CANCELLED");
    expect(after.paymentStatus).toBe("REFUNDED");
    // And a new payment can't even be started.
    expect((await createOrder(passenger, booking.id)).status).toBe(409);
  });

  it("keeps paid passengers when the ride starts", async () => {
    const { rider, ride } = await rideWith({ availableSeats: 1, rideType: "WITH_TIP", tipAmount: 50 });
    const passenger = await registerUser();
    const booking = (await accept(rider, (await requestJoin(ride, passenger)).id)).body.data;
    await pay(passenger, booking.id);
    const start = await request(app).post(`/api/rides/${ride.id}/start`).set(auth(rider));
    expect(start.body.data.releasedUnpaid).toBe(0);
    expect((await getBooking(passenger, booking.id)).bookingStatus).toBe("CONFIRMED");
  });
});

describe("Gap 4 - expiry and payment deadline sweep", () => {
  it("expires a ride that never started, refunding and closing everything", async () => {
    const { rider, ride } = await rideWith({ availableSeats: 2, rideType: "WITH_TIP", tipAmount: 50 });
    const paidPassenger = await registerUser();
    const waitingPassenger = await registerUser();
    const booking = (await accept(rider, (await requestJoin(ride, paidPassenger)).id)).body.data;
    await pay(paidPassenger, booking.id);
    const pending = await requestJoin(ride, waitingPassenger);
    // Departure was yesterday.
    await pool.query(`UPDATE "rides" SET "departure_date" = CURRENT_DATE - 1 WHERE "id" = $1`, [ride.id]);

    await tripLifecycleService.sweep();

    expect((await getRide(rider, ride.id)).status).toBe("EXPIRED");
    const after = await getBooking(paidPassenger, booking.id);
    expect(after.bookingStatus).toBe("CANCELLED");
    expect(after.paymentStatus).toBe("REFUNDED");
    const { rows } = await pool.query('SELECT "status" FROM "ride_requests" WHERE "id" = $1', [pending.id]);
    expect(rows[0].status).toBe("EXPIRED");
    expect(await notificationTypes(rider)).toContain("RIDE_EXPIRED");
    expect(await notificationTypes(waitingPassenger)).toContain("RIDE_EXPIRED");

    // An expired ride can't be published again.
    expect((await request(app).post(`/api/rides/${ride.id}/publish`).set(auth(rider))).status).toBe(409);
  });

  it("leaves rides that haven't departed yet alone", async () => {
    const { rider, ride } = await rideWith();
    await tripLifecycleService.sweep();
    expect((await getRide(rider, ride.id)).status).toBe("PUBLISHED");
  });

  it("releases a seat whose payment deadline passed", async () => {
    const { rider, ride } = await rideWith({ availableSeats: 1, rideType: "WITH_TIP", tipAmount: 50 });
    const passenger = await registerUser();
    const booking = (await accept(rider, (await requestJoin(ride, passenger)).id)).body.data;
    await pool.query(`UPDATE "bookings" SET "created_at" = now() - interval '2 hours' WHERE "id" = $1`, [booking.id]);

    await tripLifecycleService.sweep();

    expect((await getBooking(passenger, booking.id)).bookingStatus).toBe("CANCELLED");
    expect((await getRide(rider, ride.id)).availableSeats).toBe(1);
    expect(await notificationTypes(passenger)).toContain("BOOKING_CANCELLED");
  });
});
