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

describe("Ride requests and bookings", () => {
  it("runs the full free-ride flow: request -> accept -> confirmed booking", async () => {
    const rider = await registerUser();
    const passenger = await registerUser();
    const vehicle = await createVehicle(rider.token);
    const ride = await createPublishedRide(rider.token, vehicle.id, { availableSeats: 1, rideType: "WITHOUT_TIP", tipAmount: 0 });

    const reqRes = await request(app)
      .post(`/api/rides/${ride.id}/requests`)
      .set("Authorization", `Bearer ${passenger.token}`)
      .send({ ...pickupDrop, seatsRequested: 1 });
    expect(reqRes.status).toBe(201);
    expect(reqRes.body.data.status).toBe("REQUESTED");

    const acceptRes = await request(app)
      .put(`/api/ride-requests/${reqRes.body.data.id}/accept`)
      .set("Authorization", `Bearer ${rider.token}`);
    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.data.bookingStatus).toBe("CONFIRMED");
    expect(acceptRes.body.data.paymentStatus).toBe("NOT_REQUIRED");

    const rideAfter = await request(app).get(`/api/rides/${ride.id}`).set("Authorization", `Bearer ${passenger.token}`);
    expect(rideAfter.body.data.availableSeats).toBe(0);
  });

  it("rejects a rider requesting their own ride", async () => {
    const rider = await registerUser();
    const vehicle = await createVehicle(rider.token);
    const ride = await createPublishedRide(rider.token, vehicle.id);

    const res = await request(app)
      .post(`/api/rides/${ride.id}/requests`)
      .set("Authorization", `Bearer ${rider.token}`)
      .send({ ...pickupDrop, seatsRequested: 1 });
    expect(res.status).toBe(400);
  });

  it("rejects a duplicate active request from the same passenger", async () => {
    const rider = await registerUser();
    const passenger = await registerUser();
    const vehicle = await createVehicle(rider.token);
    const ride = await createPublishedRide(rider.token, vehicle.id, { availableSeats: 2 });

    const first = await request(app)
      .post(`/api/rides/${ride.id}/requests`)
      .set("Authorization", `Bearer ${passenger.token}`)
      .send({ ...pickupDrop, seatsRequested: 1 });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post(`/api/rides/${ride.id}/requests`)
      .set("Authorization", `Bearer ${passenger.token}`)
      .send({ ...pickupDrop, seatsRequested: 1 });
    expect(second.status).toBe(409);
  });

  it("rejects a request for more seats than are available", async () => {
    const rider = await registerUser();
    const passenger = await registerUser();
    const vehicle = await createVehicle(rider.token);
    const ride = await createPublishedRide(rider.token, vehicle.id, { availableSeats: 1 });

    const res = await request(app)
      .post(`/api/rides/${ride.id}/requests`)
      .set("Authorization", `Bearer ${passenger.token}`)
      .send({ ...pickupDrop, seatsRequested: 2 });
    expect(res.status).toBe(409);
  });

  it("rejects acceptance once seats have already sold out", async () => {
    const rider = await registerUser();
    const passengerA = await registerUser();
    const passengerB = await registerUser();
    const vehicle = await createVehicle(rider.token);
    const ride = await createPublishedRide(rider.token, vehicle.id, { availableSeats: 1 });

    const reqA = await request(app)
      .post(`/api/rides/${ride.id}/requests`)
      .set("Authorization", `Bearer ${passengerA.token}`)
      .send({ ...pickupDrop, seatsRequested: 1 });

    // Second passenger's request is accepted before capacity is known to be gone;
    // the seat check happens at accept time (spec section 12/13).
    const reqB = await request(app)
      .post(`/api/rides/${ride.id}/requests`)
      .set("Authorization", `Bearer ${passengerB.token}`)
      .send({ ...pickupDrop, seatsRequested: 1 });

    const acceptA = await request(app)
      .put(`/api/ride-requests/${reqA.body.data.id}/accept`)
      .set("Authorization", `Bearer ${rider.token}`);
    expect(acceptA.status).toBe(200);

    const acceptB = await request(app)
      .put(`/api/ride-requests/${reqB.body.data.id}/accept`)
      .set("Authorization", `Bearer ${rider.token}`);
    expect(acceptB.status).toBe(409);
    expect(acceptB.body.message).toMatch(/no seats/i);
  });

  it("only the ride owner can accept a request", async () => {
    const rider = await registerUser();
    const passenger = await registerUser();
    const stranger = await registerUser();
    const vehicle = await createVehicle(rider.token);
    const ride = await createPublishedRide(rider.token, vehicle.id);

    const reqRes = await request(app)
      .post(`/api/rides/${ride.id}/requests`)
      .set("Authorization", `Bearer ${passenger.token}`)
      .send({ ...pickupDrop, seatsRequested: 1 });

    const res = await request(app)
      .put(`/api/ride-requests/${reqRes.body.data.id}/accept`)
      .set("Authorization", `Bearer ${stranger.token}`);
    expect(res.status).toBe(403);
  });
});
