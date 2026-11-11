import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { request, app, registerUser, createVehicle, createPublishedRide } from "./helpers.js";
import { env } from "../src/config/env.js";

// Test rides start at (13.1147, 80.1). 0.001 deg of latitude is about 111 m.
const START = { latitude: 13.1147, longitude: 80.1 };

describe("Start trip only at the starting point", () => {
  beforeAll(() => { env.lifecycle.startMaxDistanceM = 500; });
  afterAll(() => { env.lifecycle.startMaxDistanceM = 0; });

  async function publishedRide() {
    const rider = await registerUser();
    const vehicle = await createVehicle(rider.token);
    const ride = await createPublishedRide(rider.token, vehicle.id);
    return { rider, ride };
  }
  const start = (rider, rideId, body) =>
    request(app).post(`/api/rides/${rideId}/start`).set("Authorization", `Bearer ${rider.token}`).send(body);

  it("starts when the rider is within 500 m of the start", async () => {
    const { rider, ride } = await publishedRide();
    const res = await start(rider, ride.id, { latitude: START.latitude + 0.004, longitude: START.longitude }); // ~445 m
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("STARTED");
  });

  it("refuses when the rider is more than 500 m away, saying how far", async () => {
    const { rider, ride } = await publishedRide();
    const res = await start(rider, ride.id, { latitude: START.latitude + 0.006, longitude: START.longitude }); // ~667 m
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/You're 66\d m from the starting point .*within 500 m/);

    const far = await start(rider, ride.id, { latitude: START.latitude + 0.05, longitude: START.longitude }); // ~5.6 km
    expect(far.body.message).toMatch(/5\.\d km from the starting point/);

    const after = await request(app).get(`/api/rides/${ride.id}`).set("Authorization", `Bearer ${rider.token}`);
    expect(after.body.data.status).toBe("PUBLISHED");
  });

  it("refuses when no location is sent", async () => {
    const { rider, ride } = await publishedRide();
    const res = await start(rider, ride.id, {});
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Turn on location/);
  });
});
