import { describe, it, expect } from "@jest/globals";
import { request, app, registerUser } from "./helpers.js";
import { pool } from "../src/config/db.js";

const sendCode = (phone) => request(app).post("/api/auth/login/otp").send({ phone });
const login = (phone, otp) => request(app).post("/api/auth/login/otp/verify").send({ phone, otp });

describe("Login with mobile number + OTP (no password)", () => {
  it("logs a registered user in with the code sent to their number", async () => {
    const { user } = await registerUser();
    const sent = await sendCode(user.phone);
    expect(sent.status).toBe(200);
    expect(sent.body.data.devOtp).toMatch(/^\d{6}$/);

    const res = await login(`+91 ${user.phone}`, sent.body.data.devOtp); // any format of the same number
    expect(res.status).toBe(200);
    expect(res.body.data.user.id).toBe(user.id);
    expect(res.body.data.user).not.toHaveProperty("passwordHash");

    // The token works.
    const me = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${res.body.data.token}`);
    expect(me.body.data.id).toBe(user.id);
  });

  it("a new number verifies, then signs up with just name and email - no password", async () => {
    const phone = "9" + String(Math.floor(Math.random() * 1e9)).padStart(9, "0");
    const sent = await sendCode(phone);
    expect(sent.status).toBe(200);

    const verified = await login(phone, sent.body.data.devOtp);
    expect(verified.status).toBe(200);
    expect(verified.body.data).toMatchObject({ isNewUser: true, phone });
    expect(verified.body.data).not.toHaveProperty("token");

    const email = `new${Date.now()}${Math.floor(Math.random() * 1e6)}@example.test`;
    const reg = await request(app).post("/api/auth/register").send({
      firstName: "New", lastName: "Rider", email, phone, phoneVerificationToken: verified.body.data.phoneVerificationToken,
    });
    expect(reg.status).toBe(201);
    expect(reg.body.data.user.phone).toBe(phone);

    // Next time the same number goes straight in.
    const again = await login(phone, (await sendCode(phone)).body.data.devOtp);
    expect(again.body.data.user.id).toBe(reg.body.data.user.id);
    // And there's no password to log in with.
    const pw = await request(app).post("/api/auth/login").send({ email, password: "whatever123" });
    expect(pw.status).toBe(401);
  });

  it("can't sign up with a verification that wasn't for this number", async () => {
    const phone = "8" + String(Math.floor(Math.random() * 1e9)).padStart(9, "0");
    const reg = await request(app).post("/api/auth/register").send({
      firstName: "X", lastName: "Y", email: `x${Date.now()}@example.test`, phone, phoneVerificationToken: "not-a-real-token",
    });
    expect(reg.status).toBe(400);
  });

  it("refuses a wrong code, and a code can't be used twice", async () => {
    const { user } = await registerUser();
    const { devOtp } = (await sendCode(user.phone)).body.data;
    const wrong = devOtp === "000000" ? "111111" : "000000";
    const bad = await login(user.phone, wrong);
    expect(bad.status).toBe(400);
    expect(bad.body.message).toMatch(/Incorrect code/);

    expect((await login(user.phone, devOtp)).status).toBe(200);
    expect((await login(user.phone, devOtp)).status).toBe(400);
  });

  it("won't log in a deactivated account", async () => {
    const { user } = await registerUser();
    await pool.query('UPDATE "users" SET "is_active" = false WHERE "id" = $1', [user.id]);
    expect((await sendCode(user.phone)).status).toBe(403);
  });
});
