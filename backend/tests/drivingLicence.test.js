import { describe, it, expect, jest, afterEach } from "@jest/globals";
import crypto from "node:crypto";
import { request, app, registerUser, createVehicle, verifyLicence, futureDate } from "./helpers.js";
import { vehicleRepository } from "../src/repositories/vehicle.repository.js";
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
    expect(st.body.data).toMatchObject({ isRider: false, canCreateTrip: false, missing: ["LICENCE", "VEHICLE"] });
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

  it("creating a trip needs a verified licence and a verified vehicle", async () => {
    const user = await registerUser();
    const vehicle = await createVehicle(user.token);
    expect((await status(user)).body.data).toMatchObject({ isRider: true, canCreateTrip: false, missing: ["LICENCE", "VEHICLE"] });

    await vehicleRepository.update(vehicle.id, { verificationStatus: "VERIFIED" });
    const noLicence = await request(app).post("/api/rides").set("Authorization", `Bearer ${user.token}`).send(ridePayload(vehicle.id));
    expect(noLicence.status).toBe(403);
    expect(noLicence.body.message).toMatch(/driving licence/);

    await verifyLicence(user.user.id, { expiryDate: "2020-01-01" });
    const expired = await request(app).post("/api/rides").set("Authorization", `Bearer ${user.token}`).send(ridePayload(vehicle.id));
    expect(expired.status).toBe(403);
    expect(expired.body.message).toMatch(/expired/);

    await verifyLicence(user.user.id);
    expect((await status(user)).body.data).toMatchObject({ canCreateTrip: true, missing: [] });
    const ok = await request(app).post("/api/rides").set("Authorization", `Bearer ${user.token}`).send(ridePayload(vehicle.id));
    expect(ok.status).toBe(201);
  });

  it("public profiles don't show licence details", async () => {
    const [a, b] = [await registerUser(), await registerUser()];
    await verifyLicence(a.user.id);
    const res = await request(app).get(`/api/users/${a.user.id}`).set("Authorization", `Bearer ${b.token}`);
    expect(JSON.stringify(res.body)).not.toMatch(/licence/i);
  });
});
