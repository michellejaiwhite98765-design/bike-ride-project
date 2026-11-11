import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { request, app, registerUser, createVehicle, createPublishedRide } from "./helpers.js";
import { env } from "../src/config/env.js";
import { locationStore } from "../src/realtime/locationStore.js";
import { evaluateLiveJoin } from "../src/services/liveJoin.service.js";

// The test ride runs in a straight line (no road route in tests):
// (13.1147, 80.1) -> (13.0827, 80.2707), about 18.8 km.
const at = (fraction) => ({ latitude: 13.1147 - 0.032 * fraction, longitude: 80.1 + 0.1707 * fraction });

const config = { enabled: true, maxProgress: 0.5, minAheadKm: 2, staleAfterMs: 60000 };
const now = 1_000_000;

describe("Live join rules", () => {
  const fresh = { latitude: 0, longitude: 0, at: now - 5000 };

  it("allows a join before half way with the pickup well ahead", () => {
    const r = evaluateLiveJoin({ position: fresh, progress: { routeKm: 100, riderFraction: 0.2, pickupFraction: 0.4 }, now, config });
    expect(r).toMatchObject({ allowed: true, progressPercent: 20, remainingKm: 80, pickupAheadKm: 20 });
  });

  it("refuses once the rider is half way", () => {
    const r = evaluateLiveJoin({ position: fresh, progress: { routeKm: 100, riderFraction: 0.5, pickupFraction: 0.8 }, now, config });
    expect(r).toMatchObject({ allowed: false, reason: "PAST_HALF" });
  });

  it("refuses a pickup the rider has passed or is about to reach", () => {
    expect(evaluateLiveJoin({ position: fresh, progress: { routeKm: 100, riderFraction: 0.3, pickupFraction: 0.1 }, now, config }).reason).toBe("PICKUP_PASSED");
    expect(evaluateLiveJoin({ position: fresh, progress: { routeKm: 100, riderFraction: 0.3, pickupFraction: 0.31 }, now, config }).reason).toBe("PICKUP_PASSED");
  });

  it("refuses when the rider's location is missing or stale", () => {
    expect(evaluateLiveJoin({ position: null, progress: null, now, config }).reason).toBe("NO_LOCATION");
    const old = { ...fresh, at: now - 120000 };
    expect(evaluateLiveJoin({ position: old, progress: { routeKm: 100, riderFraction: 0.1, pickupFraction: 0.5 }, now, config }).reason).toBe("NO_LOCATION");
  });

  it("refuses everything when live join is turned off", () => {
    const r = evaluateLiveJoin({ position: fresh, progress: { routeKm: 100, riderFraction: 0.1, pickupFraction: 0.5 }, now, config: { ...config, enabled: false } });
    expect(r.reason).toBe("DISABLED");
  });
});

describe("Joining a trip that has started", () => {
  // Auto-accept is on in production; a join on a moving trip must still wait for the rider.
  beforeAll(() => { env.lifecycle.autoAcceptRequests = true; });
  afterAll(() => { env.lifecycle.autoAcceptRequests = false; });

  async function startedRide(overrides = {}) {
    const rider = await registerUser();
    const vehicle = await createVehicle(rider.token);
    const ride = await createPublishedRide(rider.token, vehicle.id, { availableSeats: 1, rideType: "WITHOUT_TIP", tipAmount: 0, ...overrides });
    const res = await request(app).post(`/api/rides/${ride.id}/start`).set("Authorization", `Bearer ${rider.token}`);
    expect(res.status).toBe(200);
    return { rider, ride };
  }

  function riderAt(ride, riderId, fraction) {
    locationStore.set(ride.id, riderId, { ...at(fraction), userType: "rider", updatedAt: new Date().toISOString() });
  }

  const join = (token, rideId, pickupFraction) => {
    const p = at(pickupFraction);
    const d = at(1);
    return request(app).post(`/api/rides/${rideId}/requests`).set("Authorization", `Bearer ${token}`).send({
      pickupName: "Pickup", pickupLatitude: p.latitude, pickupLongitude: p.longitude,
      dropName: "Drop", dropLatitude: d.latitude, dropLongitude: d.longitude, seatsRequested: 1,
    });
  };

  it("sends the request to the rider (no auto-accept) when the pickup is ahead and it's before half way", async () => {
    const { rider, ride } = await startedRide();
    riderAt(ride, rider.user.id, 0.2);
    const passenger = await registerUser();

    const res = await join(passenger.token, ride.id, 0.6);
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe("REQUESTED");

    const notes = await request(app).get("/api/notifications").set("Authorization", `Bearer ${rider.token}`);
    const list = notes.body.data.items || notes.body.data;
    const note = list.find((n) => n.type === "RIDE_REQUEST_CREATED");
    expect(note.title).toBe("Passenger wants to join on the way");
    expect(note.message).toMatch(/km ahead/);

    // The rider accepts: the seat is reserved on the moving trip.
    const accept = await request(app).put(`/api/ride-requests/${res.body.data.id}/accept`).set("Authorization", `Bearer ${rider.token}`);
    expect(accept.status).toBe(200);
    expect(accept.body.data.bookingStatus).toBe("CONFIRMED");
  });

  it("refuses at accept time if the rider has passed the pickup since", async () => {
    const { rider, ride } = await startedRide();
    riderAt(ride, rider.user.id, 0.1);
    const passenger = await registerUser();
    const res = await join(passenger.token, ride.id, 0.45);
    expect(res.status).toBe(201);

    riderAt(ride, rider.user.id, 0.48);
    const accept = await request(app).put(`/api/ride-requests/${res.body.data.id}/accept`).set("Authorization", `Bearer ${rider.token}`);
    expect(accept.status).toBe(409);
    expect(accept.body.message).toMatch(/passed your pickup/);
  });

  it("refuses once the rider is past half way", async () => {
    const { rider, ride } = await startedRide();
    riderAt(ride, rider.user.id, 0.6);
    const passenger = await registerUser();
    const res = await join(passenger.token, ride.id, 0.9);
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/more than half way/);
  });

  it("refuses a pickup the rider has already passed", async () => {
    const { rider, ride } = await startedRide();
    riderAt(ride, rider.user.id, 0.4);
    const passenger = await registerUser();
    const res = await join(passenger.token, ride.id, 0.2);
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/passed your pickup/);
  });

  it("refuses when the rider's live location isn't known", async () => {
    const { ride } = await startedRide();
    const passenger = await registerUser();
    const res = await join(passenger.token, ride.id, 0.8);
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/live location/);
  });

  it("shows a started trip in search only while it can still be joined", async () => {
    // A route of its own, so rides left by other tests at the same spot
    // can't push this one out of the top search results.
    const from = { latitude: 12.5 + Math.random() * 0.3, longitude: 79.0 + Math.random() * 0.3 };
    const to = { latitude: from.latitude - 0.032, longitude: from.longitude + 0.1707 };
    const along = (f) => ({ latitude: from.latitude + (to.latitude - from.latitude) * f, longitude: from.longitude + (to.longitude - from.longitude) * f });
    const { rider, ride } = await startedRide({
      sourceLatitude: from.latitude, sourceLongitude: from.longitude,
      destinationLatitude: to.latitude, destinationLongitude: to.longitude,
    });
    const searcher = await registerUser();
    const pickup = along(0.7);
    const search = () => request(app).get("/api/rides/search").set("Authorization", `Bearer ${searcher.token}`).query({
      sourceLatitude: pickup.latitude, sourceLongitude: pickup.longitude,
      destinationLatitude: to.latitude, destinationLongitude: to.longitude,
      date: String(ride.departureDate).slice(0, 10), seats: 1,
    });
    const riderAlong = (f) => locationStore.set(ride.id, rider.user.id, { ...along(f), userType: "rider", updatedAt: new Date().toISOString() });

    riderAlong(0.2);
    const open = (await search()).body.data.find((r) => r.id === ride.id);
    expect(open).toBeDefined();
    expect(open.live).toMatchObject({ allowed: true, progressPercent: 20 });

    riderAlong(0.55);
    const closed = (await search()).body.data.find((r) => r.id === ride.id);
    expect(closed).toBeUndefined();
  });
});
