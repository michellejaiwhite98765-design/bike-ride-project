import { describe, it, expect } from "@jest/globals";
import sharp from "sharp";
import { request, app, registerUser, createVehicle, createPublishedRide } from "./helpers.js";

const auth = (u) => ({ Authorization: `Bearer ${u.token}` });
const picture = (w = 1200, h = 900) => sharp({ create: { width: w, height: h, channels: 3, background: { r: 200, g: 30, b: 30 } } }).jpeg().toBuffer();
const upload = async (u, vehicleId, buffer, name = "bike.jpg") =>
  request(app).put(`/api/vehicles/${vehicleId}/photo`).set(auth(u)).attach("photo", buffer, { filename: name, contentType: "image/jpeg" });

describe("Vehicle photo", () => {
  it("saves a resized WEBP photo for the owner's vehicle", async () => {
    const rider = await registerUser();
    const vehicle = await createVehicle(rider.token);
    const res = await upload(rider, vehicle.id, await picture());
    expect(res.status).toBe(200);
    expect(res.body.data.photo).toMatch(/^data:image\/webp;base64,/);
    const img = await sharp(Buffer.from(res.body.data.photo.split(",")[1], "base64")).metadata();
    expect([img.width, img.height]).toEqual([800, 600]);
    // It shows in the owner's vehicle list.
    const list = await request(app).get("/api/vehicles").set(auth(rider));
    expect(list.body.data.find((v) => v.id === vehicle.id).photo).toBe(res.body.data.photo);
  });

  it("only the owner can set it, and it must be a picture", async () => {
    const rider = await registerUser();
    const other = await registerUser();
    const vehicle = await createVehicle(rider.token);
    expect((await upload(other, vehicle.id, await picture())).status).toBe(403);
    const notPic = await request(app).put(`/api/vehicles/${vehicle.id}/photo`).set(auth(rider))
      .attach("photo", Buffer.from("hello"), { filename: "a.txt", contentType: "text/plain" });
    expect(notPic.status).toBe(400);
    const none = await request(app).put(`/api/vehicles/${vehicle.id}/photo`).set(auth(rider));
    expect(none.status).toBe(400);
  });

  it("passengers see it on the trip page, but not in trip lists", async () => {
    const rider = await registerUser();
    const vehicle = await createVehicle(rider.token);
    const photo = (await upload(rider, vehicle.id, await picture())).body.data.photo;
    const ride = await createPublishedRide(rider.token, vehicle.id);
    const passenger = await registerUser();
    const details = await request(app).get(`/api/rides/${ride.id}`).set(auth(passenger));
    expect(details.body.data.vehicle.photo).toBe(photo);
  });
});
