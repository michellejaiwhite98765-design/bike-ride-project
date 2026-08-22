import { describe, it, expect } from "@jest/globals";
import { request, app, registerUser, createVehicle, createPublishedRide } from "./helpers.js";

const pickupDrop = {
  pickupName: "Pickup",
  pickupLatitude: 13.1147,
  pickupLongitude: 80.1,
  dropName: "Drop",
  dropLatitude: 13.0827,
  dropLongitude: 80.2707,
};

async function completedBooking() {
  const rider = await registerUser();
  const passenger = await registerUser();
  const vehicle = await createVehicle(rider.token);
  const ride = await createPublishedRide(rider.token, vehicle.id, { availableSeats: 1 });

  const reqRes = await request(app)
    .post(`/api/rides/${ride.id}/requests`)
    .set("Authorization", `Bearer ${passenger.token}`)
    .send({ ...pickupDrop, seatsRequested: 1 });
  const acceptRes = await request(app)
    .put(`/api/ride-requests/${reqRes.body.data.id}/accept`)
    .set("Authorization", `Bearer ${rider.token}`);

  await request(app).post(`/api/rides/${ride.id}/start`).set("Authorization", `Bearer ${rider.token}`);
  await request(app).post(`/api/rides/${ride.id}/complete`).set("Authorization", `Bearer ${rider.token}`);

  return { rider, passenger, booking: acceptRes.body.data };
}

describe("Ratings", () => {
  it("allows a passenger to rate the rider after ride completion", async () => {
    const { rider, passenger, booking } = await completedBooking();

    const res = await request(app)
      .post("/api/ratings")
      .set("Authorization", `Bearer ${passenger.token}`)
      .send({ bookingId: booking.id, revieweeId: rider.user.id, score: 5, comment: "Great ride" });

    expect(res.status).toBe(201);

    const ratings = await request(app)
      .get(`/api/users/${rider.user.id}/ratings`)
      .set("Authorization", `Bearer ${passenger.token}`);
    expect(ratings.body.data).toHaveLength(1);
  });

  it("rejects a duplicate rating for the same booking/reviewer/reviewee", async () => {
    const { rider, passenger, booking } = await completedBooking();
    const payload = { bookingId: booking.id, revieweeId: rider.user.id, score: 4 };

    await request(app).post("/api/ratings").set("Authorization", `Bearer ${passenger.token}`).send(payload);
    const dup = await request(app).post("/api/ratings").set("Authorization", `Bearer ${passenger.token}`).send(payload);

    expect(dup.status).toBe(409);
  });

  it("rejects rating before the ride is completed", async () => {
    const rider = await registerUser();
    const passenger = await registerUser();
    const vehicle = await createVehicle(rider.token);
    const ride = await createPublishedRide(rider.token, vehicle.id, { availableSeats: 1 });

    const reqRes = await request(app)
      .post(`/api/rides/${ride.id}/requests`)
      .set("Authorization", `Bearer ${passenger.token}`)
      .send({ ...pickupDrop, seatsRequested: 1 });
    const acceptRes = await request(app)
      .put(`/api/ride-requests/${reqRes.body.data.id}/accept`)
      .set("Authorization", `Bearer ${rider.token}`);

    const res = await request(app)
      .post("/api/ratings")
      .set("Authorization", `Bearer ${passenger.token}`)
      .send({ bookingId: acceptRes.body.data.id, revieweeId: rider.user.id, score: 5 });

    expect(res.status).toBe(409);
  });
});
