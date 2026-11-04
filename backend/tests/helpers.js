import crypto from "node:crypto";
import request from "supertest";
import { app } from "../src/app.js";
import { vehicleRepository } from "../src/repositories/vehicle.repository.js";
import { drivingLicenceRepository } from "../src/repositories/drivingLicence.repository.js";

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
export function uniquePhone() {
  return `9${crypto.randomInt(100000000, 999999999)}`;
}

// Must match the validator's Indian plate regex (e.g. TN01AB1234), not just
// be unique - a plain numeric suffix like the old `TN${unique()}` doesn't
// satisfy /^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}$/, so every test that
// creates a vehicle was failing registration validation before this fix.
function uniqueRegistrationNumber() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const letter1 = letters[crypto.randomInt(0, 26)];
  const letter2 = letters[crypto.randomInt(0, 26)];
  const digits = crypto.randomInt(1000, 9999);
  return `TN01${letter1}${letter2}${digits}`;
}

/** Sends + verifies a sign-up OTP (test mode returns the code) and returns the verification token. */
export async function verifyPhone(phone) {
  const sent = await request(app).post("/api/auth/phone-otp").send({ phone });
  if (sent.status !== 200) throw new Error(`phone-otp failed: ${sent.status} ${JSON.stringify(sent.body)}`);
  const verified = await request(app).post("/api/auth/phone-otp/verify").send({ phone, otp: sent.body.data.devOtp });
  if (verified.status !== 200) throw new Error(`phone-otp/verify failed: ${verified.status} ${JSON.stringify(verified.body)}`);
  return verified.body.data.verificationToken;
}

export async function registerUser(overrides = {}) {
  const id = unique();
  const phone = overrides.phone || uniquePhone();
  const payload = {
    firstName: "Test",
    lastName: "User",
    email: `user${id}@example.test`,
    phone,
    password: "password123",
    phoneVerificationToken: await verifyPhone(phone),
    ...overrides,
  };
  const res = await request(app).post("/api/auth/register").send(payload);
  if (res.status !== 201) {
    throw new Error(`registerUser failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return { token: res.body.data.token, user: res.body.data.user };
}

export async function createVehicle(token, overrides = {}) {
  const payload = {
    vehicleType: "MOTORCYCLE",
    brand: "Honda",
    model: "Activa",
    registrationNumber: uniqueRegistrationNumber(),
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

// ride.service.js#create requires a VERIFIED vehicle, but the RC-upload +
// way2api verification flow needs a real document/external call that can't
// run in tests - go straight to the DB instead, same as a completed manual
// verification would leave the row.
export async function verifyVehicle(vehicleId) {
  const vehicle = await vehicleRepository.update(vehicleId, { verificationStatus: "VERIFIED" });
  await verifyLicence(vehicle.ownerId);
  return vehicle;
}

// Creating a trip also needs a verified driving licence; the real flow OCRs
// an uploaded document, so tests write the verified row directly.
export async function verifyLicence(userId, overrides = {}) {
  return drivingLicenceRepository.upsert(userId, {
    licenceNumber: `TN01${crypto.randomInt(10000000000, 99999999999)}`,
    expiryDate: futureDate(365),
    status: "VERIFIED",
    verifiedAt: new Date(),
    ...overrides,
  });
}

export async function createPublishedRide(token, vehicleId, overrides = {}) {
  await verifyVehicle(vehicleId);

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
