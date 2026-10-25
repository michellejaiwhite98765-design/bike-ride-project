import { describe, it, expect } from "@jest/globals";
import { request, app, registerUser, createVehicle, createPublishedRide, futureDate } from "./helpers.js";
import { detourLimitKm, classifyPickup } from "../src/utils/pickupZone.js";

describe("Detour limit by trip length", () => {
  it.each([
    [5, 2.5], // short trip: never below the 2.5 km on-route radius
    [20, 4], // 20% of 20 km
    [100, 20], // 20% of 100 km
    [300, 30], // capped at 30 km
  ])("%s km trip -> %s km", (routeKm, expected) => {
    expect(detourLimitKm(routeKm)).toBeCloseTo(expected, 1);
  });

  it("classifies on-route, detour (fare goes up per extra km), and too far", () => {
    expect(classifyPickup({ routeKm: 100, pickupKm: 2.4 })).toMatchObject({ zone: "ON_ROUTE", extraTip: 0 });
    // Free ride, 15 km off a 100 km route: 30 km extra (+30%) at Rs 5/km = Rs 150
    expect(classifyPickup({ routeKm: 100, pickupKm: 15 })).toMatchObject({
      zone: "DETOUR", extraKm: 30, detourPercent: 30, ratePerKm: 5, extraTip: 150,
    });
    // Paid ride at Rs 800 for 100 km = Rs 8/km: 30 km extra = Rs 240
    expect(classifyPickup({ routeKm: 100, pickupKm: 15, baseFare: 800 })).toMatchObject({ zone: "DETOUR", ratePerKm: 8, extraTip: 240 });
    // Pickup and drop both off the route: both legs count
    expect(classifyPickup({ routeKm: 100, pickupKm: 5, dropKm: 3 })).toMatchObject({ zone: "DETOUR", extraKm: 16 });
    expect(classifyPickup({ routeKm: 100, pickupKm: 25 })).toMatchObject({ zone: "TOO_FAR", reason: "PICKUP_TOO_FAR" });
    expect(classifyPickup({ routeKm: 100, pickupKm: 1, goesForward: false })).toMatchObject({ zone: "TOO_FAR", reason: "WRONG_DIRECTION" });
  });
});

// Rider Colachel -> Tirunelveli, with a road route through Nagercoil (~89 km).
const COLACHEL = [8.1773, 77.2569];
const NAGERCOIL = [8.1785, 77.4296];
const TIRUNELVELI = [8.7139, 77.7567];
const MARTHANDAM = [8.308, 77.2217]; // ~15 km off the route, behind the start
const route = { routePath: [COLACHEL, NAGERCOIL, TIRUNELVELI] };
const rideAt = (date) => ({
  sourceName: "Colachel", sourceLatitude: COLACHEL[0], sourceLongitude: COLACHEL[1],
  destinationName: "Tirunelveli", destinationLatitude: TIRUNELVELI[0], destinationLongitude: TIRUNELVELI[1],
  departureDate: date, ...route,
});
const toTirunelveli = (lat, lng, name = "Pickup") => ({
  pickupName: name, pickupLatitude: lat, pickupLongitude: lng,
  dropName: "Tirunelveli", dropLatitude: TIRUNELVELI[0], dropLongitude: TIRUNELVELI[1], seatsRequested: 1,
});

describe("Two-zone pickup: rider Colachel -> Tirunelveli", () => {
  it("flow 1 - passenger in Nagercoil, on the route: normal request, no extra fare", async () => {
    const rider = await registerUser();
    const ride = await createPublishedRide(rider.token, (await createVehicle(rider.token)).id, rideAt(futureDate(12)));
    const passenger = await registerUser();
    const res = await request(app).post(`/api/rides/${ride.id}/requests`).set("Authorization", `Bearer ${passenger.token}`).send(toTirunelveli(...NAGERCOIL, "Nagercoil"));
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ pickupZone: "ON_ROUTE" });
    expect(Number(res.body.data.extraTip)).toBe(0);
  });

  it("flow 2 - passenger in Marthandam, off the route: detour allowed, fare goes up for the extra km", async () => {
    const rider = await registerUser();
    const ride = await createPublishedRide(rider.token, (await createVehicle(rider.token)).id, { ...rideAt(futureDate(13)), rideType: "WITHOUT_TIP", tipAmount: 0 });
    const passenger = await registerUser();

    const check = await request(app).get(`/api/rides/${ride.id}/requests/join-check`)
      .query({ pickupLatitude: MARTHANDAM[0], pickupLongitude: MARTHANDAM[1], dropLatitude: TIRUNELVELI[0], dropLongitude: TIRUNELVELI[1] })
      .set("Authorization", `Bearer ${passenger.token}`);
    expect(check.body.data.zone).toBe("DETOUR");
    expect(check.body.data.extraKm).toBeGreaterThan(25);
    expect(check.body.data.extraTip).toBe(Math.round(check.body.data.extraKm * 5));
    expect(check.body.data.message).toMatch(/fare goes up/);

    const req = await request(app).post(`/api/rides/${ride.id}/requests`).set("Authorization", `Bearer ${passenger.token}`).send(toTirunelveli(...MARTHANDAM, "Marthandam"));
    expect(req.status).toBe(201);
    expect(req.body.data.pickupZone).toBe("DETOUR");

    const accept = await request(app).put(`/api/ride-requests/${req.body.data.id}/accept`).set("Authorization", `Bearer ${rider.token}`);
    expect(accept.body.data.bookingStatus).toBe("PAYMENT_PENDING");
    expect(Number(accept.body.data.tipAmount)).toBe(check.body.data.extraTip);

    const order = await request(app).post("/api/payments/orders").set("Authorization", `Bearer ${passenger.token}`).send({ bookingId: accept.body.data.id });
    expect(order.status).toBe(200);
  });

  it("beyond the limit: refused as too far", async () => {
    const rider = await registerUser();
    const ride = await createPublishedRide(rider.token, (await createVehicle(rider.token)).id, rideAt(futureDate(14)));
    const passenger = await registerUser();
    const res = await request(app).post(`/api/rides/${ride.id}/requests`).set("Authorization", `Bearer ${passenger.token}`).send(toTirunelveli(9.2, 77.43, "Far away"));
    expect(res.status).toBe(400);
    expect(res.body.errors.zone).toBe("TOO_FAR");
  });

  it("search finds the ride from Nagercoil and Marthandam, shows the zone and request state, hides it when too far", async () => {
    const date = futureDate(15);
    const rider = await registerUser();
    const ride = await createPublishedRide(rider.token, (await createVehicle(rider.token)).id, rideAt(date));
    const passenger = await registerUser();
    const search = (lat, lng) => request(app).get("/api/rides/search")
      .query({ sourceLatitude: lat, sourceLongitude: lng, destinationLatitude: TIRUNELVELI[0], destinationLongitude: TIRUNELVELI[1], date, includeFull: true })
      .set("Authorization", `Bearer ${passenger.token}`);

    const near = (await search(...NAGERCOIL)).body.data.find((r) => r.id === ride.id);
    expect(near.pickupZone.zone).toBe("ON_ROUTE");
    expect(near.myRequest).toBeNull();
    const detour = (await search(...MARTHANDAM)).body.data.find((r) => r.id === ride.id);
    expect(detour.pickupZone.zone).toBe("DETOUR");
    const far = (await search(9.2, 77.43)).body.data.find((r) => r.id === ride.id);
    expect(far).toBeUndefined();

    const sent = await request(app).post(`/api/rides/${ride.id}/requests`).set("Authorization", `Bearer ${passenger.token}`).send(toTirunelveli(...NAGERCOIL, "Nagercoil"));
    const after = (await search(...NAGERCOIL)).body.data.find((r) => r.id === ride.id);
    expect(after.myRequest).toEqual({ id: sent.body.data.id, status: "REQUESTED" });
  });
});
