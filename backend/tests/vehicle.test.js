import { describe, it, expect } from "@jest/globals";
import { request, app, registerUser, createVehicle } from "./helpers.js";

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
