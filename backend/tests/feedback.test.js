import { describe, it, expect } from "@jest/globals";
import { request, app, registerUser } from "./helpers.js";
import { pool } from "../src/config/db.js";

const auth = (user) => ({ Authorization: `Bearer ${user.token}` });

async function adminUser() {
  const admin = await registerUser();
  await pool.query(`UPDATE "users" SET "role" = 'ADMIN' WHERE "id" = $1`, [admin.user.id]);
  return admin;
}

describe("Customer feedback", () => {
  it("lets a customer send feedback and see it in their list", async () => {
    const customer = await registerUser();
    const res = await request(app).post("/api/feedback").set(auth(customer))
      .send({ category: "APP", rating: 4, message: "Search is slow on my phone" });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ category: "APP", rating: 4, status: "OPEN" });

    const mine = await request(app).get("/api/feedback").set(auth(customer));
    expect(mine.body.data).toHaveLength(1);
    expect(mine.body.data[0].message).toBe("Search is slow on my phone");

    // nobody else sees it in their own list
    const other = await registerUser();
    expect((await request(app).get("/api/feedback").set(auth(other))).body.data).toHaveLength(0);
  });

  it("rejects a bad category or an empty message", async () => {
    const customer = await registerUser();
    expect((await request(app).post("/api/feedback").set(auth(customer)).send({ category: "NOPE", message: "Hello there" })).status).toBe(400);
    expect((await request(app).post("/api/feedback").set(auth(customer)).send({ category: "APP", message: "  " })).status).toBe(400);
  });

  it("only admins can list and answer feedback", async () => {
    const customer = await registerUser();
    expect((await request(app).get("/api/admin/feedback").set(auth(customer))).status).toBe(403);
  });

  it("an admin reply reaches the customer, and resolving it shows in their list", async () => {
    const customer = await registerUser();
    const admin = await adminUser();
    const fb = (await request(app).post("/api/feedback").set(auth(customer))
      .send({ category: "PAYMENT", message: "I was charged twice" })).body.data;

    const list = await request(app).get("/api/admin/feedback").set(auth(admin));
    const row = list.body.data.find((f) => f.id === fb.id);
    expect(row.user.id).toBe(customer.user.id);

    const reply = await request(app).put(`/api/admin/feedback/${fb.id}`).set(auth(admin)).send({ adminReply: "Refund started, 3-5 days" });
    expect(reply.status).toBe(200);
    expect(reply.body.data).toMatchObject({ status: "IN_REVIEW", adminReply: "Refund started, 3-5 days" });

    const notes = (await request(app).get("/api/notifications").set(auth(customer))).body.data;
    expect(notes.find((n) => n.type === "FEEDBACK_UPDATED")).toMatchObject({ title: "We replied to your feedback" });

    await request(app).put(`/api/admin/feedback/${fb.id}`).set(auth(admin)).send({ status: "RESOLVED" });
    const mine = (await request(app).get("/api/feedback").set(auth(customer))).body.data[0];
    expect(mine).toMatchObject({ status: "RESOLVED", adminReply: "Refund started, 3-5 days" });
  });
});
