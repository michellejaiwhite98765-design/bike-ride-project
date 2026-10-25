import { describe, it, expect } from "@jest/globals";
import { request, app, registerUser, createVehicle, createPublishedRide, futureDate } from "./helpers.js";
import { pool } from "../src/config/db.js";

// Ride used by createPublishedRide: Avadi (13.1147, 80.1) -> Chennai Central (13.0827, 80.2707).
const nearPickup = {
  pickupName: "Avadi",
  pickupLatitude: 13.1147,
  pickupLongitude: 80.1,
  dropName: "Chennai Central",
  dropLatitude: 13.0827,
  dropLongitude: 80.2707,
};

async function requestRide(token, rideId, body = nearPickup) {
  return request(app).post(`/api/rides/${rideId}/requests`).set("Authorization", `Bearer ${token}`).send({ ...body, seatsRequested: 1 });
}

async function riderWithRide(overrides) {
  const rider = await registerUser();
  const vehicle = await createVehicle(rider.token);
  const ride = await createPublishedRide(rider.token, vehicle.id, overrides);
  return { rider, ride };
}

describe("Join request rules", () => {
  it("rejects a passenger whose pickup is far from the ride's route", async () => {
    const { ride } = await riderWithRide();
    const passenger = await registerUser();

    // Nagercoil - hundreds of km from the Avadi -> Chennai Central route.
    const res = await requestRide(passenger.token, ride.id, { ...nearPickup, pickupName: "Nagercoil", pickupLatitude: 8.1833, pickupLongitude: 77.4119 });
    expect(res.status).toBe(400);
    expect(res.body.errors.reason).toBe("PICKUP_TOO_FAR");
  });

  it("accepts a pickup that is along the route, not just at the start", async () => {
    const { ride } = await riderWithRide();
    const passenger = await registerUser();

    // Roughly the midpoint of the route.
    const res = await requestRide(passenger.token, ride.id, { ...nearPickup, pickupName: "Midway", pickupLatitude: 13.099, pickupLongitude: 80.185 });
    expect(res.status).toBe(201);
  });

  it("measures distance against the ride's real road route when one was saved", async () => {
    // A road route that bends north through (13.2, 80.15) instead of going straight.
    const routePath = [[13.1147, 80.1], [13.2, 80.15], [13.0827, 80.2707]];
    const { ride } = await riderWithRide({ routePath });
    const onTheBend = await registerUser();
    const onTheStraightLine = await registerUser();

    // On the actual road, though nowhere near the straight start-end line: allowed.
    const ok = await requestRide(onTheBend.token, ride.id, { ...nearPickup, pickupName: "Bend", pickupLatitude: 13.2, pickupLongitude: 80.15 });
    expect(ok.status).toBe(201);

    // On the straight line, but kilometres off the road the rider will take.
    const far = await requestRide(onTheStraightLine.token, ride.id, { ...nearPickup, pickupName: "Shortcut", pickupLatitude: 13.099, pickupLongitude: 80.185 });
    expect(far.status).toBe(400);
    expect(far.body.errors.reason).toBe("PICKUP_TOO_FAR");
  });

  it("uses a tighter radius for ON_ROUTE rides than for PASSENGER_LOCATION rides", async () => {
    const routePath = [[13.1147, 80.1], [13.0827, 80.2707]];
    const onRoute = await riderWithRide({ routePath, pickupPreference: "ON_ROUTE" });
    const comesToYou = await riderWithRide({ routePath, pickupPreference: "PASSENGER_LOCATION" });
    // About 1.5 km north of the start point.
    const pickup = { pickupLatitude: 13.1282, pickupLongitude: 80.1 };

    const check = (rideId, token) =>
      request(app).get(`/api/rides/${rideId}/requests/join-check`).query(pickup).set("Authorization", `Bearer ${token}`);
    const passenger = await registerUser();

    const a = await check(onRoute.ride.id, passenger.token);
    expect(a.body.data).toMatchObject({ ok: false, reason: "PICKUP_TOO_FAR", radiusKm: 1 });
    const b = await check(comesToYou.ride.id, passenger.token);
    expect(b.body.data).toMatchObject({ ok: true, radiusKm: 2 });
  });

  it("rejects a drop point far from the route, and a trip in the opposite direction", async () => {
    const { ride } = await riderWithRide({ routePath: [[13.1147, 80.1], [13.0827, 80.2707]] });
    const passenger = await registerUser();

    const farDrop = await requestRide(passenger.token, ride.id, { ...nearPickup, dropName: "Tambaram", dropLatitude: 12.9249, dropLongitude: 80.1 });
    expect(farDrop.status).toBe(400);
    expect(farDrop.body.errors.reason).toBe("DROP_TOO_FAR");

    // Pickup at the destination end, drop at the start end.
    const backwards = await requestRide(passenger.token, ride.id, {
      pickupName: "Chennai Central", pickupLatitude: 13.0827, pickupLongitude: 80.2707,
      dropName: "Avadi", dropLatitude: 13.1147, dropLongitude: 80.1,
    });
    expect(backwards.status).toBe(400);
    expect(backwards.body.errors.reason).toBe("WRONG_DIRECTION");
  });

  it("shows the passenger their own request status and hides the rider phone until accepted", async () => {
    const { rider, ride } = await riderWithRide();
    const passenger = await registerUser();

    const before = await request(app).get(`/api/rides/${ride.id}`).set("Authorization", `Bearer ${passenger.token}`);
    expect(before.body.data.myRequestStatus).toBeNull();
    expect(before.body.data.rider.phone).toBeNull();

    const reqRes = await requestRide(passenger.token, ride.id);
    const pending = await request(app).get(`/api/rides/${ride.id}`).set("Authorization", `Bearer ${passenger.token}`);
    expect(pending.body.data.myRequestStatus).toBe("REQUESTED");
    expect(pending.body.data.rider.phone).toBeNull();

    await request(app).put(`/api/ride-requests/${reqRes.body.data.id}/accept`).set("Authorization", `Bearer ${rider.token}`);
    const accepted = await request(app).get(`/api/rides/${ride.id}`).set("Authorization", `Bearer ${passenger.token}`);
    expect(accepted.body.data.myRequestStatus).toBe("ACCEPTED");
    expect(accepted.body.data.rider.phone).toBeTruthy();
  });

  it("withdraws the passenger's other pending requests for the same time once one is accepted", async () => {
    const date = futureDate(9);
    const a = await riderWithRide({ departureDate: date, departureTime: "08:00" });
    const b = await riderWithRide({ departureDate: date, departureTime: "08:30" });
    const evening = await riderWithRide({ departureDate: date, departureTime: "18:00" });
    const passenger = await registerUser();

    const reqA = await requestRide(passenger.token, a.ride.id);
    const reqB = await requestRide(passenger.token, b.ride.id);
    const reqEvening = await requestRide(passenger.token, evening.ride.id);
    expect([reqA.status, reqB.status, reqEvening.status]).toEqual([201, 201, 201]);

    await request(app).put(`/api/ride-requests/${reqA.body.data.id}/accept`).set("Authorization", `Bearer ${a.rider.token}`);

    const bView = await request(app).get(`/api/rides/${b.ride.id}`).set("Authorization", `Bearer ${passenger.token}`);
    expect(bView.body.data.myRequestStatus).toBeNull();
    const eveningView = await request(app).get(`/api/rides/${evening.ride.id}`).set("Authorization", `Bearer ${passenger.token}`);
    expect(eveningView.body.data.myRequestStatus).toBe("REQUESTED");

    // And a new request for another ride at the same time is refused.
    const c = await riderWithRide({ departureDate: date, departureTime: "07:30" });
    const reqC = await requestRide(passenger.token, c.ride.id);
    expect(reqC.status).toBe(409);
  });
});

describe("Starting a ride", () => {
  it("refuses to start without a confirmed passenger", async () => {
    const { rider, ride } = await riderWithRide();
    const res = await request(app).post(`/api/rides/${ride.id}/start`).set("Authorization", `Bearer ${rider.token}`);
    expect(res.status).toBe(409);
  });

  it("expires unanswered requests when the ride starts", async () => {
    const { rider, ride } = await riderWithRide({ availableSeats: 1 });
    const p1 = await registerUser();
    const p2 = await registerUser();
    const r1 = await requestRide(p1.token, ride.id);
    await requestRide(p2.token, ride.id);
    await request(app).put(`/api/ride-requests/${r1.body.data.id}/accept`).set("Authorization", `Bearer ${rider.token}`);

    const start = await request(app).post(`/api/rides/${ride.id}/start`).set("Authorization", `Bearer ${rider.token}`);
    expect(start.status).toBe(200);
    expect(start.body.data.status).toBe("STARTED");

    const list = await request(app).get(`/api/rides/${ride.id}/requests`).set("Authorization", `Bearer ${rider.token}`);
    const statuses = list.body.data.map((r) => r.status).sort();
    expect(statuses).toEqual(["ACCEPTED", "EXPIRED"]);
  });
});

describe("Service area (India only)", () => {
  it("refuses a ride that ends outside India", async () => {
    const rider = await registerUser();
    const vehicle = await createVehicle(rider.token);
    // Kanyakumari -> New York.
    await expect(
      createPublishedRide(rider.token, vehicle.id, { destinationName: "New York", destinationLatitude: 40.7128, destinationLongitude: -74.006 })
    ).rejects.toThrow(/only within India/);
  });

  it("allows a long ride that stays inside India (Kanyakumari -> Kashmir)", async () => {
    const rider = await registerUser();
    const vehicle = await createVehicle(rider.token);
    const ride = await createPublishedRide(rider.token, vehicle.id, {
      sourceName: "Kanyakumari", sourceLatitude: 8.0883, sourceLongitude: 77.5385,
      destinationName: "Srinagar", destinationLatitude: 34.0837, destinationLongitude: 74.7973,
    });
    expect(ride.status).toBe("PUBLISHED");
  });

  it("refuses a join request with a pickup outside India", async () => {
    const { ride } = await riderWithRide();
    const passenger = await registerUser();
    const res = await requestRide(passenger.token, ride.id, { ...nearPickup, pickupName: "London", pickupLatitude: 51.5072, pickupLongitude: -0.1276 });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/only within India/);
  });
});

describe("Closing old trips", () => {
  it("expires a ride that was never started so the rider can create their next trip", async () => {
    const rider = await registerUser();
    const vehicle = await createVehicle(rider.token);
    const oldRide = await createPublishedRide(rider.token, vehicle.id);
    const passenger = await registerUser();
    const reqRes = await requestRide(passenger.token, oldRide.id);
    await request(app).put(`/api/ride-requests/${reqRes.body.data.id}/accept`).set("Authorization", `Bearer ${rider.token}`);

    // While it's still upcoming, a second trip is refused.
    await expect(createPublishedRide(rider.token, vehicle.id, { departureDate: futureDate(7) })).rejects.toThrow(/current trip/);

    // Pretend its departure was yesterday and it never started.
    await pool.query(`UPDATE "rides" SET "departure_date" = CURRENT_DATE - 1 WHERE "id" = $1`, [oldRide.id]);

    const next = await createPublishedRide(rider.token, vehicle.id, { departureDate: futureDate(7) });
    expect(next.status).toBe("PUBLISHED");

    const old = await request(app).get(`/api/rides/${oldRide.id}`).set("Authorization", `Bearer ${rider.token}`);
    expect(old.body.data.status).toBe("EXPIRED");
    const booking = await request(app).get("/api/bookings").set("Authorization", `Bearer ${passenger.token}`);
    expect(booking.body.data.find((b) => b.rideId === oldRide.id).bookingStatus).toBe("CANCELLED");
  });

  it("closes pending requests and tells passengers when the rider cancels", async () => {
    const { rider, ride } = await riderWithRide({ availableSeats: 1 });
    const passenger = await registerUser();
    await requestRide(passenger.token, ride.id);

    await request(app).post(`/api/rides/${ride.id}/cancel`).set("Authorization", `Bearer ${rider.token}`);

    const view = await request(app).get(`/api/rides/${ride.id}`).set("Authorization", `Bearer ${passenger.token}`);
    expect(view.body.data.myRequestStatus).toBeNull();
    const notes = await request(app).get("/api/notifications").set("Authorization", `Bearer ${passenger.token}`);
    expect(notes.body.data.some((n) => n.type === "RIDE_CANCELLED" && n.data?.rideId === ride.id)).toBe(true);
  });
});

describe("Searching along a ride's road route", () => {
  // Road route bending north through (13.2, 80.15), far from the straight start-end line.
  const routePath = [[13.1147, 80.1], [13.2, 80.15], [13.0827, 80.2707]];
  const search = (token, from, extra = {}) =>
    request(app)
      .get("/api/rides/search")
      .query({
        sourceLatitude: from[0], sourceLongitude: from[1],
        destinationLatitude: 13.0827, destinationLongitude: 80.2707,
        date: futureDate(11), includeFull: true, ...extra,
      })
      .set("Authorization", `Bearer ${token}`);

  it("finds a ride from a town the road passes through, not just near its start", async () => {
    const { ride } = await riderWithRide({ routePath, departureDate: futureDate(11) });
    const passenger = await registerUser();
    const res = await search(passenger.token, [13.2, 80.15]);
    expect(res.body.data.map((r) => r.id)).toContain(ride.id);
  });

  it("only lists rides the passenger could actually join", async () => {
    const { ride } = await riderWithRide({ routePath, departureDate: futureDate(11), pickupPreference: "ON_ROUTE" });
    const passenger = await registerUser();
    // About 1.5 km from the road: over the 1 km ON_ROUTE limit.
    const res = await search(passenger.token, [13.2135, 80.15]);
    expect(res.body.data.map((r) => r.id)).not.toContain(ride.id);
    // The home page's broad "near me" browse (explicit radius) still shows it.
    const browse = await search(passenger.token, [13.2135, 80.15], { radius: 50 });
    expect(browse.body.data.map((r) => r.id)).toContain(ride.id);
  });
});
