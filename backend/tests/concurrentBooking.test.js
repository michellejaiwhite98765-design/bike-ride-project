import { describe, it, expect } from "@jest/globals";
import { request, app, registerUser, createVehicle, createPublishedRide } from "./helpers.js";

const pickupDrop = {
  pickupName: "Pickup",
  pickupLatitude: 13.1147,
  pickupLongitude: 80.1,
  dropName: "Drop",
  dropLatitude: 13.0827,
  dropLongitude: 80.2707,
};

/**
 * Spec section 42 "Critical Test Case": with availableSeats = 1, two passengers
 * both get accepted at nearly the same instant must never both succeed. The
 * row-level lock taken in bookingService.acceptRequest (SELECT ... FOR UPDATE on
 * the ride) is what's under test here - without it this test is flaky/fails.
 */
describe("Concurrent seat booking (critical race condition)", () => {
  it("allows exactly one of two simultaneous accepts to succeed on a single-seat ride", async () => {
    const rider = await registerUser();
    const passengerA = await registerUser();
    const passengerB = await registerUser();
    const vehicle = await createVehicle(rider.token);
    const ride = await createPublishedRide(rider.token, vehicle.id, { availableSeats: 1 });

    const [reqA, reqB] = await Promise.all([
      request(app)
        .post(`/api/rides/${ride.id}/requests`)
        .set("Authorization", `Bearer ${passengerA.token}`)
        .send({ ...pickupDrop, seatsRequested: 1 }),
      request(app)
        .post(`/api/rides/${ride.id}/requests`)
        .set("Authorization", `Bearer ${passengerB.token}`)
        .send({ ...pickupDrop, seatsRequested: 1 }),
    ]);
    expect(reqA.status).toBe(201);
    expect(reqB.status).toBe(201);

    const [acceptA, acceptB] = await Promise.all([
      request(app).put(`/api/ride-requests/${reqA.body.data.id}/accept`).set("Authorization", `Bearer ${rider.token}`),
      request(app).put(`/api/ride-requests/${reqB.body.data.id}/accept`).set("Authorization", `Bearer ${rider.token}`),
    ]);

    const statuses = [acceptA.status, acceptB.status].sort();
    expect(statuses).toEqual([200, 409]);

    const rideAfter = await request(app).get(`/api/rides/${ride.id}`).set("Authorization", `Bearer ${rider.token}`);
    expect(rideAfter.body.data.availableSeats).toBe(0);
    expect(rideAfter.body.data.availableSeats).toBeGreaterThanOrEqual(0);
  });
});
