import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { request, app, registerUser, createVehicle, createPublishedRide } from "./helpers.js";
import { env } from "../src/config/env.js";

const pickupDrop = {
  pickupName: "Pickup",
  pickupLatitude: 13.1147,
  pickupLongitude: 80.1,
  dropName: "Drop",
  dropLatitude: 13.0827,
  dropLongitude: 80.2707,
};

describe("Auto-accept join requests", () => {
  beforeAll(() => { env.lifecycle.autoAcceptRequests = true; });
  afterAll(() => { env.lifecycle.autoAcceptRequests = false; });

  const join = (token, rideId, seats = 1) =>
    request(app).post(`/api/rides/${rideId}/requests`).set("Authorization", `Bearer ${token}`).send({ ...pickupDrop, seatsRequested: seats });

  it("accepts a join request at once, reserves the seat and tells the driver", async () => {
    const rider = await registerUser();
    const passenger = await registerUser({ firstName: "Priya", lastName: "K" });
    const vehicle = await createVehicle(rider.token);
    const ride = await createPublishedRide(rider.token, vehicle.id, { availableSeats: 1, rideType: "WITHOUT_TIP", tipAmount: 0 });

    const res = await join(passenger.token, ride.id);
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe("ACCEPTED");
    expect(res.body.data.booking.bookingStatus).toBe("CONFIRMED");

    const after = await request(app).get(`/api/rides/${ride.id}`).set("Authorization", `Bearer ${passenger.token}`);
    expect(after.body.data.availableSeats).toBe(0);

    const notes = await request(app).get("/api/notifications").set("Authorization", `Bearer ${rider.token}`);
    const list = notes.body.data.items || notes.body.data;
    const joined = list.find((n) => n.type === "PASSENGER_JOINED");
    expect(joined.title).toBe("Passenger joined your ride");
    expect(joined.message).toMatch(/Priya K joined your ride/);
  });

  it("asks a paid-ride passenger to pay after auto-accept", async () => {
    const rider = await registerUser();
    const passenger = await registerUser();
    const vehicle = await createVehicle(rider.token);
    const ride = await createPublishedRide(rider.token, vehicle.id, { availableSeats: 1, rideType: "WITH_TIP", tipAmount: 40 });

    const res = await join(passenger.token, ride.id);
    expect(res.body.data.status).toBe("ACCEPTED");
    expect(res.body.data.booking.paymentStatus).toBe("PENDING");
  });

  it("refuses when the seats are already taken and leaves no pending request", async () => {
    const rider = await registerUser();
    const first = await registerUser();
    const second = await registerUser();
    const vehicle = await createVehicle(rider.token);
    const ride = await createPublishedRide(rider.token, vehicle.id, { availableSeats: 1, rideType: "WITHOUT_TIP", tipAmount: 0 });

    expect((await join(first.token, ride.id)).status).toBe(201);
    const res = await join(second.token, ride.id);
    expect(res.status).toBe(409);

    const mine = await request(app).get(`/api/rides/${ride.id}/requests/mine`).set("Authorization", `Bearer ${second.token}`);
    expect(mine.body.data).toBeNull();
  });
});
