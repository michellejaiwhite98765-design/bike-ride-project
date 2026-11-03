import { describe, it, expect } from "@jest/globals";
import { request, app } from "./helpers.js";
import { registerUser, verifyPhone, uniquePhone } from "./helpers.js";

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
        phoneVerificationToken: "unused",
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

  describe("sign-up phone OTP", () => {
    const base = () => ({ firstName: "Otp", lastName: "User", email: `otp${uniquePhone()}@example.test`, password: "password123" });

    it("refuses to register a phone that was never verified", async () => {
      const res = await request(app).post("/api/auth/register").send({ ...base(), phone: uniquePhone(), phoneVerificationToken: "made-up" });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/verify your mobile number/i);
    });

    it("refuses a missing verification token", async () => {
      const res = await request(app).post("/api/auth/register").send({ ...base(), phone: uniquePhone() });
      expect(res.status).toBe(400);
    });

    it("rejects a wrong code and counts attempts", async () => {
      const phone = uniquePhone();
      const sent = await request(app).post("/api/auth/phone-otp").send({ phone });
      const wrong = sent.body.data.devOtp === "000000" ? "111111" : "000000";
      const res = await request(app).post("/api/auth/phone-otp/verify").send({ phone, otp: wrong });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/4 attempts left/);
    });

    it("won't resend within 30 seconds", async () => {
      const phone = uniquePhone();
      await request(app).post("/api/auth/phone-otp").send({ phone });
      const again = await request(app).post("/api/auth/phone-otp").send({ phone });
      expect(again.status).toBe(429);
    });

    it("a verification can't be used for a different number", async () => {
      const token = await verifyPhone(uniquePhone());
      const res = await request(app).post("/api/auth/register").send({ ...base(), phone: uniquePhone(), phoneVerificationToken: token });
      expect(res.status).toBe(400);
    });

    it("a verification creates only one account", async () => {
      const phone = uniquePhone();
      const token = await verifyPhone(phone);
      const first = await request(app).post("/api/auth/register").send({ ...base(), phone, phoneVerificationToken: token });
      expect(first.status).toBe(201);
      const second = await request(app).post("/api/auth/register").send({ ...base(), phone, phoneVerificationToken: token });
      expect(second.status).toBe(409);
    });

    it("treats +91 / spaces as the same number", async () => {
      const phone = uniquePhone();
      const token = await verifyPhone(`+91 ${phone.slice(0, 5)} ${phone.slice(5)}`);
      const res = await request(app).post("/api/auth/register").send({ ...base(), phone, phoneVerificationToken: token });
      expect(res.status).toBe(201);
      expect(res.body.data.user.phone).toBe(phone);
    });

    it("won't send a code to an already registered number", async () => {
      const { user } = await registerUser();
      const res = await request(app).post("/api/auth/phone-otp").send({ phone: user.phone });
      expect(res.status).toBe(409);
    });
  });

  it("rejects requests without a token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });
});
