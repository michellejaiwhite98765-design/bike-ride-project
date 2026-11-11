import { describe, it, expect } from "@jest/globals";
import { request, app, registerUser, createVehicle, createPublishedRide } from "./helpers.js";

const auth = (user) => ({ Authorization: `Bearer ${user.token}` });
const pickupDrop = {
  pickupName: "Pickup", pickupLatitude: 13.1147, pickupLongitude: 80.1,
  dropName: "Drop", dropLatitude: 13.0827, dropLongitude: 80.2707,
};

async function otpOfType(user, type) {
  const res = await request(app).get("/api/notifications").set(auth(user));
  return res.body.data.find((n) => n.type === type)?.message.match(/(\d{6})/)?.[1];
}

/** A started ride with one passenger on board (free ride, so no payment step). */
async function boardedPassenger() {
  const rider = await registerUser();
  const passenger = await registerUser();
  const vehicle = await createVehicle(rider.token);
  const ride = await createPublishedRide(rider.token, vehicle.id, { availableSeats: 1, rideType: "WITHOUT_TIP", tipAmount: 0 });
  const req = await request(app).post(`/api/rides/${ride.id}/requests`).set(auth(passenger)).send({ ...pickupDrop, seatsRequested: 1 });
  const booking = (await request(app).put(`/api/ride-requests/${req.body.data.id}/accept`).set(auth(rider))).body.data;
  await request(app).post(`/api/rides/${ride.id}/start`).set(auth(rider));
  await request(app).post(`/api/bookings/${booking.id}/pickup-otp`).set(auth(rider));
  await request(app).post(`/api/bookings/${booking.id}/verify-pickup`).set(auth(passenger)).send({ otp: await otpOfType(passenger, "PICKUP_OTP") });
  return { rider, passenger, ride, booking };
}

const rate = (user, booking, revieweeId, score = 5) =>
  request(app).post("/api/ratings").set(auth(user)).send({ bookingId: booking.id, revieweeId, score, comment: "Smooth ride" });

describe("Reviewing the driver after the drop", () => {
  it("is closed while the passenger is still on board", async () => {
    const { rider, passenger, booking } = await boardedPassenger();
    const res = await rate(passenger, booking, rider.user.id);
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/dropped off/);
  });

  it("opens as soon as the drop is confirmed, before the trip is completed", async () => {
    const { rider, passenger, ride, booking } = await boardedPassenger();
    await request(app).post(`/api/bookings/${booking.id}/drop-otp`).set(auth(rider));
    const drop = await request(app).post(`/api/bookings/${booking.id}/verify-drop`).set(auth(passenger)).send({ otp: await otpOfType(passenger, "DROP_OTP") });
    expect(drop.body.data.boardingStatus).toBe("DROPPED");

    // the passenger is asked to review the driver
    const notes = (await request(app).get("/api/notifications").set(auth(passenger))).body.data;
    const ask = notes.find((n) => n.type === "RATE_DRIVER");
    expect(ask).toBeDefined();
    expect(ask.data.bookingId).toBe(booking.id);

    const before = await request(app).get(`/api/bookings/${booking.id}`).set(auth(passenger));
    expect(before.body.data.myDriverRating).toBeNull();
    expect((await request(app).get(`/api/rides/${ride.id}`).set(auth(rider))).body.data.status).toBe("STARTED");

    const res = await rate(passenger, booking, rider.user.id, 4);
    expect(res.status).toBe(201);
    expect((await rate(passenger, booking, rider.user.id)).status).toBe(409); // only once

    const after = await request(app).get(`/api/bookings/${booking.id}`).set(auth(passenger));
    expect(after.body.data.myDriverRating).toMatchObject({ score: 4, comment: "Smooth ride" });

    // the review shows on the driver's profile and reviews list
    const reviews = await request(app).get(`/api/users/${rider.user.id}/ratings`).set(auth(passenger));
    expect(reviews.body.data[0]).toMatchObject({ score: 4, comment: "Smooth ride" });
    const profile = await request(app).get(`/api/users/${rider.user.id}`).set(auth(passenger));
    expect(profile.body.data).toMatchObject({ rating: 4, ratingCount: 1 });
  });
});

describe("Driver-only ratings list", () => {
  it("keeps only reviews from trips the user drove", async () => {
    const { rider, passenger, booking } = await boardedPassenger();
    await request(app).post(`/api/bookings/${booking.id}/drop-otp`).set(auth(rider));
    await request(app).post(`/api/bookings/${booking.id}/verify-drop`).set(auth(passenger)).send({ otp: await otpOfType(passenger, "DROP_OTP") });
    // Each side rates the other on the same booking.
    expect((await rate(passenger, booking, rider.user.id, 5)).status).toBe(201);
    expect((await rate(rider, booking, passenger.user.id, 3)).status).toBe(201);

    const asDriver = await request(app).get(`/api/users/${rider.user.id}/ratings?as=driver`).set(auth(rider));
    expect(asDriver.body.data.map((r) => r.score)).toEqual([5]);
    // The passenger was never the driver, so nothing for them.
    const passengerAsDriver = await request(app).get(`/api/users/${passenger.user.id}/ratings?as=driver`).set(auth(passenger));
    expect(passengerAsDriver.body.data).toEqual([]);
    // Without the filter, all reviews are still returned.
    const all = await request(app).get(`/api/users/${passenger.user.id}/ratings`).set(auth(passenger));
    expect(all.body.data).toHaveLength(1);
  });
});
