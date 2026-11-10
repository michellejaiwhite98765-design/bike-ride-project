import { describe, it, expect } from "@jest/globals";
import { request, app, registerUser, createVehicle, createPublishedRide, futureDate, verifyVehicle } from "./helpers.js";

describe("Ride creation", () => {
  it("rejects WITHOUT_TIP rides with a nonzero tip amount", async () => {
    const { token } = await registerUser();
    const vehicle = await createVehicle(token);

    const res = await request(app)
      .post("/api/rides")
      .set("Authorization", `Bearer ${token}`)
      .send({
        vehicleId: vehicle.id,
        sourceName: "A",
        sourceLatitude: 13.1,
        sourceLongitude: 80.1,
        destinationName: "B",
        destinationLatitude: 13.2,
        destinationLongitude: 80.2,
        departureDate: futureDate(),
        departureTime: "08:00",
        availableSeats: 1,
        rideType: "WITHOUT_TIP",
        tipAmount: 50,
      });

    expect(res.status).toBe(400);
  });

  it("rejects WITH_TIP rides with a zero tip amount", async () => {
    const { token } = await registerUser();
    const vehicle = await createVehicle(token);

    const res = await request(app)
      .post("/api/rides")
      .set("Authorization", `Bearer ${token}`)
      .send({
        vehicleId: vehicle.id,
        sourceName: "A",
        sourceLatitude: 13.1,
        sourceLongitude: 80.1,
        destinationName: "B",
        destinationLatitude: 13.2,
        destinationLongitude: 80.2,
        departureDate: futureDate(),
        departureTime: "08:00",
        availableSeats: 1,
        rideType: "WITH_TIP",
        tipAmount: 0,
      });

    expect(res.status).toBe(400);
  });

  it("creates a ride as DRAFT and only becomes searchable after publish", async () => {
    const { token } = await registerUser();
    const vehicle = await createVehicle(token);
    await verifyVehicle(vehicle.id);
    const draftDate = futureDate(6);

    const createRes = await request(app)
      .post("/api/rides")
      .set("Authorization", `Bearer ${token}`)
      .send({
        vehicleId: vehicle.id,
        sourceName: "Avadi",
        sourceLatitude: 13.1147,
        sourceLongitude: 80.1,
        destinationName: "Chennai Central",
        destinationLatitude: 13.0827,
        destinationLongitude: 80.2707,
        departureDate: draftDate,
        departureTime: "08:00",
        availableSeats: 1,
        rideType: "WITHOUT_TIP",
        tipAmount: 0,
      });
    expect(createRes.status).toBe(201);
    expect(createRes.body.data.status).toBe("DRAFT");

    const { token: searcherToken } = await registerUser();
    const beforePublish = await request(app)
      .get("/api/rides/search")
      .set("Authorization", `Bearer ${searcherToken}`)
      .query({
        sourceLatitude: 13.11,
        sourceLongitude: 80.1,
        destinationLatitude: 13.08,
        destinationLongitude: 80.27,
        date: draftDate,
        seats: 1,
      });
    expect(beforePublish.body.data.find((r) => r.id === createRes.body.data.id)).toBeUndefined();

    await request(app).post(`/api/rides/${createRes.body.data.id}/publish`).set("Authorization", `Bearer ${token}`);

    const afterPublish = await request(app)
      .get("/api/rides/search")
      .set("Authorization", `Bearer ${searcherToken}`)
      .query({
        sourceLatitude: 13.11,
        sourceLongitude: 80.1,
        destinationLatitude: 13.08,
        destinationLongitude: 80.27,
        date: draftDate,
        seats: 1,
      });
    const match = afterPublish.body.data.find((r) => r.id === createRes.body.data.id);
    expect(match).toBeDefined();
    expect(match.matchScore).toBeGreaterThan(0);
  });

  it("only the owning rider can start or cancel a ride", async () => {
    const owner = await registerUser();
    const other = await registerUser();
    const vehicle = await createVehicle(owner.token);
    const ride = await createPublishedRide(owner.token, vehicle.id);

    const res = await request(app).post(`/api/rides/${ride.id}/start`).set("Authorization", `Bearer ${other.token}`);
    expect(res.status).toBe(403);
  });
});

describe("Monthly trip limit", () => {
  const ridePayload = (vehicleId) => ({
    vehicleId,
    sourceName: "A",
    sourceLatitude: 13.1,
    sourceLongitude: 80.1,
    destinationName: "B",
    destinationLatitude: 13.2,
    destinationLongitude: 80.2,
    departureDate: futureDate(),
    departureTime: "08:00",
    availableSeats: 1,
    rideType: "WITHOUT_TIP",
    tipAmount: 0,
  });

  // Copies one real ride `count` times as CANCELLED rides (no open trip in the way).
  async function fillMonth(rideId, count, createdAt = "now()") {
    const { pool } = await import("../src/config/db.js");
    const { rows: cols } = await pool.query(
      `SELECT string_agg(quote_ident(column_name), ',') AS c FROM information_schema.columns
       WHERE table_name = 'rides' AND column_name NOT IN ('id', 'status', 'created_at', 'route_geog', 'source_geog', 'destination_geog')
         AND is_generated = 'NEVER'`
    );
    const c = cols[0].c;
    await pool.query(
      `INSERT INTO rides (id, ${c}, status, created_at)
       SELECT gen_random_uuid()::text, ${c}, 'CANCELLED', ${createdAt} FROM rides, generate_series(1, $2) WHERE id = $1`,
      [rideId, count]
    );
    await pool.query(`UPDATE rides SET status = 'CANCELLED' WHERE id = $1`, [rideId]);
  }

  it("blocks the 51st trip in a month with a clear message", async () => {
    const { token } = await registerUser();
    const vehicle = await createVehicle(token);
    await verifyVehicle(vehicle.id);
    const first = await request(app).post("/api/rides").set("Authorization", `Bearer ${token}`).send(ridePayload(vehicle.id));
    expect(first.status).toBe(201);
    await fillMonth(first.body.data.id, 49); // 50 trips this month

    const res = await request(app).post("/api/rides").set("Authorization", `Bearer ${token}`).send(ridePayload(vehicle.id));
    expect(res.status).toBe(429);
    expect(res.body.message).toMatch(/reached your monthly limit of 50 trips/);
  });

  it("does not count trips from previous months", async () => {
    const { token } = await registerUser();
    const vehicle = await createVehicle(token);
    await verifyVehicle(vehicle.id);
    const first = await request(app).post("/api/rides").set("Authorization", `Bearer ${token}`).send(ridePayload(vehicle.id));
    await fillMonth(first.body.data.id, 60, "now() - interval '40 days'");

    const res = await request(app).post("/api/rides").set("Authorization", `Bearer ${token}`).send(ridePayload(vehicle.id));
    expect(res.status).toBe(201);
  });
});
