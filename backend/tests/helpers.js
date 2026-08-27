import crypto from "node:crypto";
import request from "supertest";
import { app } from "../src/app.js";

let counter = 0;
function unique() {
  counter += 1;
  return `${Date.now()}${process.pid}${counter}${crypto.randomInt(1000, 9999)}`;
}

// Phone must stay within the 10-15 digit validator range. Jest --runInBand runs
// every test file in the same process (sharing one pid) but with independent
// module registries, so a per-file counter restarts at 1 in each file and
// collides across files against the shared dev DB - use a random 9-digit
// suffix instead so uniqueness doesn't depend on any shared/reset state.
function uniquePhone() {
  return `9${crypto.randomInt(100000000, 999999999)}`;
}

export async function registerUser(overrides = {}) {
  const id = unique();
  const payload = {
    firstName: "Test",
    lastName: "User",
    email: `user${id}@example.test`,
    phone: uniquePhone(),
    password: "password123",
    ...overrides,
  };
  const res = await request(app).post("/api/auth/register").send(payload);
  if (res.status !== 201) {
    throw new Error(`registerUser failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return { token: res.body.data.token, user: res.body.data.user };
}

export async function createVehicle(token, overrides = {}) {
  const id = unique();
  const payload = {
    vehicleType: "MOTORCYCLE",
    brand: "Honda",
    model: "Activa",
    registrationNumber: `TN${id}`.slice(0, 15),
    color: "Black",
    manufacturingYear: 2022,
    ...overrides,
  };
  const res = await request(app).post("/api/vehicles").set("Authorization", `Bearer ${token}`).send(payload);
  if (res.status !== 201) {
    throw new Error(`createVehicle failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.data;
}

export function futureDate(daysAhead = 5) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().slice(0, 10);
}

export async function createPublishedRide(token, vehicleId, overrides = {}) {
  const payload = {
    vehicleId,
    sourceName: "Avadi",
    sourceLatitude: 13.1147,
    sourceLongitude: 80.1,
    destinationName: "Chennai Central",
    destinationLatitude: 13.0827,
    destinationLongitude: 80.2707,
    departureDate: futureDate(),
    departureTime: "08:00",
    availableSeats: 1,
    rideType: "WITHOUT_TIP",
    tipAmount: 0,
    ...overrides,
  };
  const createRes = await request(app).post("/api/rides").set("Authorization", `Bearer ${token}`).send(payload);
  if (createRes.status !== 201) {
    throw new Error(`createRide failed: ${createRes.status} ${JSON.stringify(createRes.body)}`);
  }
  const rideId = createRes.body.data.id;
  const publishRes = await request(app).post(`/api/rides/${rideId}/publish`).set("Authorization", `Bearer ${token}`);
  if (publishRes.status !== 200) {
    throw new Error(`publishRide failed: ${publishRes.status} ${JSON.stringify(publishRes.body)}`);
  }
  return publishRes.body.data;
}

export { request, app };
