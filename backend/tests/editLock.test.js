import { describe, it, expect } from "@jest/globals";
import { request, app, registerUser, createVehicle, createPublishedRide } from "./helpers.js";

const pickupDrop = {
  pickupName: "Pickup", pickupLatitude: 13.1147, pickupLongitude: 80.1,
  dropName: "Drop", dropLatitude: 13.0827, dropLongitude: 80.2707, seatsRequested: 1,
};
const auth = (user) => ({ Authorization: `Bearer ${user.token}` });

async function publishedRide() {
  const rider = await registerUser();
  const vehicle = await createVehicle(rider.token);
  const ride = await createPublishedRide(rider.token, vehicle.id);
  return { rider, ride };
}
const edit = (rider, rideId) => request(app).put(`/api/rides/${rideId}`).set(auth(rider)).send({ departureTime: "09:30" });
const details = async (user, rideId) => (await request(app).get(`/api/rides/${rideId}`).set(auth(user))).body.data;

describe("Editing a trip", () => {
  it("is allowed before it starts while nobody has asked to join", async () => {
    const { rider, ride } = await publishedRide();
    expect((await details(rider, ride.id)).canEdit).toBe(true);
    const res = await edit(rider, ride.id);
    expect(res.status).toBe(200);
    expect(res.body.data.departureTime).toBe("09:30");
  });

  it("is blocked once a passenger has a join request, and allowed again if they withdraw", async () => {
    const { rider, ride } = await publishedRide();
    const passenger = await registerUser();
    const req = await request(app).post(`/api/rides/${ride.id}/requests`).set(auth(passenger)).send(pickupDrop);
    expect(req.status).toBe(201);

    const info = await details(rider, ride.id);
    expect(info.canEdit).toBe(false);
    expect(info.editBlockedReason).toMatch(/a passenger has already asked to join/);
    const res = await edit(rider, ride.id);
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/can't be edited because a passenger has already asked to join/);

    await request(app).put(`/api/ride-requests/${req.body.data.id}/cancel`).set(auth(passenger));
    expect((await edit(rider, ride.id)).status).toBe(200);
  });

  it("is blocked once the trip has started", async () => {
    const { rider, ride } = await publishedRide();
    await request(app).post(`/api/rides/${ride.id}/start`).set(auth(rider));
    const res = await edit(rider, ride.id);
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already started/);
  });

  it("doesn't tell other users whether the trip can be edited", async () => {
    const { ride } = await publishedRide();
    const other = await registerUser();
    expect((await details(other, ride.id)).canEdit).toBeUndefined();
  });
});
