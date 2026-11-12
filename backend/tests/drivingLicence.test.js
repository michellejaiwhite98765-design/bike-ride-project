import { describe, it, expect, jest, afterEach } from "@jest/globals";
import crypto from "node:crypto";
import { request, app, registerUser, createVehicle, verifyLicence, futureDate } from "./helpers.js";
import { vehicleRepository } from "../src/repositories/vehicle.repository.js";
import { env } from "../src/config/env.js";
import { rcOcrService } from "../src/services/rcOcr.service.js";

const licenceNumber = () => `TN01${crypto.randomInt(10000000000, 99999999999)}`;
const doc = Buffer.from("fake image");
const submit = (user, fields) =>
  request(app)
    .put("/api/users/me/licence")
    .set("Authorization", `Bearer ${user.token}`)
    .field(fields)
    .attach("licenceDocument", doc, { filename: "dl.jpg", contentType: "image/jpeg" });
const ocrFinds = (found) => jest.spyOn(rcOcrService, "documentContainsNumber").mockResolvedValue({ found, text: "" });
const status = (user) => request(app).get("/api/users/me/rider-status").set("Authorization", `Bearer ${user.token}`);

const ridePayload = (vehicleId) => ({
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
});

afterEach(() => jest.restoreAllMocks());

describe("Driving licence", () => {
  it("starts as not submitted; a passenger (no vehicle) is not a rider", async () => {
    const user = await registerUser();
    const res = await request(app).get("/api/users/me/licence").set("Authorization", `Bearer ${user.token}`);
    expect(res.body.data).toEqual({ status: "NOT_SUBMITTED" });
    const st = await status(user);
    expect(st.body.data).toMatchObject({ isRider: false, canCreateTrip: false, missing: ["VEHICLE"], licenceVerified: false });
  });

  it("is verified when the number is found on the document", async () => {
    const user = await registerUser();
    const spy = ocrFinds(true);
    const number = licenceNumber();
    const res = await submit(user, { licenceNumber: `${number.slice(0, 4)} ${number.slice(4)}`, expiryDate: futureDate(400), holderName: "Test User" });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ status: "VERIFIED", licenceNumber: number, holderName: "Test User" });
    expect(res.body.data.documentUrl).toBeUndefined();
    expect(spy.mock.calls[0][1]).toBe(number);
  });

  it("is rejected when the number isn't on the document", async () => {
    const user = await registerUser();
    ocrFinds(false);
    const res = await submit(user, { licenceNumber: licenceNumber(), expiryDate: futureDate(400) });
    expect(res.status).toBe(400);
    const me = await request(app).get("/api/users/me/licence").set("Authorization", `Bearer ${user.token}`);
    expect(me.body.data.status).toBe("REJECTED");
    expect(me.body.data.failureReason).toMatch(/could not be found/);
  });

  it("refuses expired licences, bad numbers and a missing document", async () => {
    const user = await registerUser();
    ocrFinds(true);
    expect((await submit(user, { licenceNumber: licenceNumber(), expiryDate: "2020-01-01" })).status).toBe(400);
    expect((await submit(user, { licenceNumber: "12345", expiryDate: futureDate(400) })).status).toBe(400);
    const noDoc = await request(app)
      .put("/api/users/me/licence")
      .set("Authorization", `Bearer ${user.token}`)
      .field({ licenceNumber: licenceNumber(), expiryDate: futureDate(400) });
    expect(noDoc.status).toBe(400);
  });

  it("a licence verified on another account can't be used again", async () => {
    const [a, b] = [await registerUser(), await registerUser()];
    ocrFinds(true);
    const number = licenceNumber();
    expect((await submit(a, { licenceNumber: number, expiryDate: futureDate(400) })).status).toBe(200);
    const res = await submit(b, { licenceNumber: number, expiryDate: futureDate(400) });
    expect(res.status).toBe(409);
  });

  it("a trip needs a verified vehicle; the licence can be added later (shown as an unverified driver)", async () => {
    const user = await registerUser();
    const vehicle = await createVehicle(user.token);
    expect((await status(user)).body.data).toMatchObject({ isRider: true, canCreateTrip: false, missing: ["VEHICLE"], licenceVerified: false });

    await vehicleRepository.update(vehicle.id, { verificationStatus: "VERIFIED" });
    expect((await status(user)).body.data).toMatchObject({ canCreateTrip: true, missing: [], licenceVerified: false });

    // No licence: the trip is created and published, and the driver shows as unverified.
    const created = await request(app).post("/api/rides").set("Authorization", `Bearer ${user.token}`).send(ridePayload(vehicle.id));
    expect(created.status).toBe(201);
    const published = await request(app).post(`/api/rides/${created.body.data.id}/publish`).set("Authorization", `Bearer ${user.token}`);
    expect(published.status).toBe(200);
    const passenger = await registerUser();
    const seen = await request(app).get(`/api/rides/${created.body.data.id}`).set("Authorization", `Bearer ${passenger.token}`);
    expect(seen.body.data.rider.licenceVerified).toBe(false);

    // An expired licence still counts as unverified.
    await verifyLicence(user.user.id, { expiryDate: "2020-01-01" });
    expect((await request(app).get(`/api/rides/${created.body.data.id}`).set("Authorization", `Bearer ${passenger.token}`)).body.data.rider.licenceVerified).toBe(false);

    // Once the licence is verified, the same trip shows a verified driver.
    await verifyLicence(user.user.id);
    expect((await status(user)).body.data).toMatchObject({ licenceVerified: true });
    expect((await request(app).get(`/api/rides/${created.body.data.id}`).set("Authorization", `Bearer ${passenger.token}`)).body.data.rider.licenceVerified).toBe(true);
  });

  it("public profiles don't show licence details", async () => {
    const [a, b] = [await registerUser(), await registerUser()];
    await verifyLicence(a.user.id);
    const res = await request(app).get(`/api/users/${a.user.id}`).set("Authorization", `Bearer ${b.token}`);
    expect(JSON.stringify(res.body)).not.toMatch(/licence/i);
  });
});

describe("Driving licence - Way2API registry check", () => {

  const reply = (status, body) => jest.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(body), { status }));
  const withKey = (fn) => async () => {
    const before = env.way2Api.apiKey;
    env.way2Api.apiKey = "test-key";
    try { await fn(); } finally { env.way2Api.apiKey = before; }
  };

  it("verifies from government records and takes name/expiry from them", withKey(async () => {
    const user = await registerUser();
    const number = licenceNumber();
    const ocr = ocrFinds(false);
    const fetchSpy = reply(200, { success: true, message: "", data: { order_id: "W2A1", result: { license_number: number, name: "SIVA MUTHU KUMAR", doe: "2037-05-05", vehicle_classes: ["MCWG", "LMV"] } } });
    const res = await submit(user, { licenceNumber: number, expiryDate: futureDate(400), dateOfBirth: "1995-06-15", holderName: "Siva" });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ status: "VERIFIED", holderName: "SIVA MUTHU KUMAR", expiryDate: "2037-05-05", verifiedBy: "WAY2API" });
    expect(JSON.parse(fetchSpy.mock.calls[0][1].body)).toEqual({ dl_number: number, dob: "15/06/1995" });
    expect(ocr).not.toHaveBeenCalled();
  }));

  it("rejects when no record matches the number + DOB", withKey(async () => {
    const user = await registerUser();
    reply(422, { success: false, message: "Verification Failed.", data: { order_id: "W2A2", result: { name: null } } });
    const res = await submit(user, { licenceNumber: licenceNumber(), expiryDate: futureDate(400), dateOfBirth: "1995-06-15" });
    expect(res.status).toBe(400);
    const got = await request(app).get("/api/users/me/licence").set("Authorization", `Bearer ${user.token}`);
    expect(got.body.data.status).toBe("REJECTED");
  }));

  it("asks for the date of birth", withKey(async () => {
    const user = await registerUser();
    const res = await submit(user, { licenceNumber: licenceNumber(), expiryDate: futureDate(400) });
    expect(res.status).toBe(400);
  }));

  it("falls back to OCR when the provider is down", withKey(async () => {
    const user = await registerUser();
    reply(503, { success: false, message: "down" });
    ocrFinds(true);
    const res = await submit(user, { licenceNumber: licenceNumber(), expiryDate: futureDate(400), dateOfBirth: "1995-06-15" });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ status: "VERIFIED", verifiedBy: "OCR" });
  }));
});
