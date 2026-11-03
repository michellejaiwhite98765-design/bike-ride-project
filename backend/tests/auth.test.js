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

  describe("changing the mobile number (OTP to old number, then new number)", () => {
    const update = (token, body) => request(app).put("/api/users/me").set("Authorization", `Bearer ${token}`).send(body);
    async function verifyCurrent(token) {
      const sent = await request(app).post("/api/users/me/phone-otp").set("Authorization", `Bearer ${token}`);
      expect(sent.status).toBe(200);
      const res = await request(app).post("/api/users/me/phone-otp/verify").set("Authorization", `Bearer ${token}`).send({ otp: sent.body.data.devOtp });
      expect(res.status).toBe(200);
      return res.body.data.currentPhoneToken;
    }

    it("refuses without any verification", async () => {
      const { token, user } = await registerUser();
      const res = await update(token, { phone: uniquePhone() });
      expect(res.status).toBe(400);
      const me = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
      expect(me.body.data.phone).toBe(user.phone);
    });

    it("refuses with only the new number verified", async () => {
      const { token } = await registerUser();
      const newPhone = uniquePhone();
      const res = await update(token, { phone: newPhone, phoneVerificationToken: await verifyPhone(newPhone) });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/current mobile number/i);
    });

    it("refuses with only the current number verified", async () => {
      const { token } = await registerUser();
      const res = await update(token, { phone: uniquePhone(), currentPhoneToken: await verifyCurrent(token) });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/new mobile number/i);
    });

    it("changes the number when both are verified, and the tokens can't be reused", async () => {
      const { token } = await registerUser();
      const currentPhoneToken = await verifyCurrent(token);
      const newPhone = uniquePhone();
      const phoneVerificationToken = await verifyPhone(newPhone);
      const res = await update(token, { phone: newPhone, currentPhoneToken, phoneVerificationToken });
      expect(res.status).toBe(200);
      expect(res.body.data.phone).toBe(newPhone);
      const again = await update(token, { phone: uniquePhone(), currentPhoneToken, phoneVerificationToken });
      expect(again.status).toBe(400);
    });

    it("needs a login to send the current-number OTP", async () => {
      const res = await request(app).post("/api/users/me/phone-otp");
      expect(res.status).toBe(401);
    });

    it("won't take another account's number", async () => {
      const { user: other } = await registerUser();
      const { token } = await registerUser();
      const res = await update(token, { phone: other.phone, phoneVerificationToken: "x", currentPhoneToken: "y" });
      expect(res.status).toBe(409);
    });

    it("saving the same number with other edits needs no OTP", async () => {
      const { token, user } = await registerUser();
      const res = await update(token, { firstName: "Renamed", phone: user.phone });
      expect(res.status).toBe(200);
      expect(res.body.data.firstName).toBe("Renamed");
    });
  });

  it("rejects requests without a token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });
});
