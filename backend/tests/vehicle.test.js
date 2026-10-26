import { describe, it, expect } from "@jest/globals";
import { request, app, registerUser, createVehicle, verifyVehicle } from "./helpers.js";

describe("Vehicles", () => {
  it("creates a vehicle for the authenticated owner", async () => {
    const { token, user } = await registerUser();
    const vehicle = await createVehicle(token);
    expect(vehicle.ownerId).toBe(user.id);
    expect(vehicle.verificationStatus).toBe("PENDING");
  });

  it("prevents another user from updating someone else's vehicle", async () => {
    const owner = await registerUser();
    const other = await registerUser();
    const vehicle = await createVehicle(owner.token);

    const res = await request(app)
      .put(`/api/vehicles/${vehicle.id}`)
      .set("Authorization", `Bearer ${other.token}`)
      .send({ color: "Red" });

    expect(res.status).toBe(403);
  });
});

describe("Registration number ownership", () => {
  const add = (user, registrationNumber) =>
    request(app).post("/api/vehicles").set("Authorization", `Bearer ${user.token}`).send({
      vehicleType: "MOTORCYCLE", brand: "Honda", model: "Activa", registrationNumber, color: "Black", manufacturingYear: 2022,
    });
  const myVehicles = async (user) => (await request(app).get("/api/vehicles").set("Authorization", `Bearer ${user.token}`)).body.data;

  it("an unverified claim on another account doesn't block the plate", async () => {
    const first = await registerUser();
    const second = await registerUser();
    const stale = await createVehicle(first.token); // saved, RC never verified

    const res = await add(second, stale.registrationNumber);
    expect(res.status).toBe(201);
    expect(res.body.data.ownerId).toBe(second.user.id);
    expect((await myVehicles(first)).map((v) => v.id)).not.toContain(stale.id);
  });

  it("a plate verified on another account stays blocked", async () => {
    const owner = await registerUser();
    const other = await registerUser();
    const vehicle = await createVehicle(owner.token);
    await verifyVehicle(vehicle.id);

    const res = await add(other, vehicle.registrationNumber);
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already verified on another account/);
  });

  it("adding the same unverified vehicle again continues with it", async () => {
    const user = await registerUser();
    const vehicle = await createVehicle(user.token);
    const again = await add(user, vehicle.registrationNumber);
    expect(again.body.data.id).toBe(vehicle.id);
    expect((await myVehicles(user)).filter((v) => v.registrationNumber === vehicle.registrationNumber)).toHaveLength(1);
  });
});
