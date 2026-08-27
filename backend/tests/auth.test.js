import { describe, it, expect } from "@jest/globals";
import { request, app } from "./helpers.js";
import { registerUser } from "./helpers.js";

describe("Auth", () => {
  it("registers a new user and returns a token", async () => {
    const { token, user } = await registerUser();
    expect(token).toBeDefined();
    expect(user.email).toContain("@example.test");
    expect(user.passwordHash).toBeUndefined();
  });

  it("rejects duplicate email registration", async () => {
    const { user } = await registerUser();
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        firstName: "Dup",
        lastName: "User",
        email: user.email,
        phone: "9888888888",
        password: "password123",
      });
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it("logs in with correct credentials", async () => {
    const { user } = await registerUser();
    const res = await request(app).post("/api/auth/login").send({ email: user.email, password: "password123" });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeDefined();
  });

  it("rejects login with wrong password", async () => {
    const { user } = await registerUser();
    const res = await request(app).post("/api/auth/login").send({ email: user.email, password: "wrongpassword" });
    expect(res.status).toBe(401);
  });

  it("returns the current user for a valid token", async () => {
    const { token, user } = await registerUser();
    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(user.id);
  });

  it("rejects requests without a token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });
});
