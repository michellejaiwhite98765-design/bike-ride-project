import { describe, it, expect } from "@jest/globals";
import { request, app, registerUser, createVehicle, createPublishedRide } from "./helpers.js";
import { pool } from "../src/config/db.js";

const pickupDrop = {
  pickupName: "Pickup",
  pickupLatitude: 13.1147,
  pickupLongitude: 80.1,
  dropName: "Drop",
  dropLatitude: 13.0827,
  dropLongitude: 80.2707,
};

const auth = (user) => ({ Authorization: `Bearer ${user.token}` });

async function confirmedBooking() {
  const rider = await registerUser();
  const passenger = await registerUser();
  const vehicle = await createVehicle(rider.token);
  const ride = await createPublishedRide(rider.token, vehicle.id, { availableSeats: 1 });
  const reqRes = await request(app).post(`/api/rides/${ride.id}/requests`).set(auth(passenger)).send({ ...pickupDrop, seatsRequested: 1 });
  const acceptRes = await request(app).put(`/api/ride-requests/${reqRes.body.data.id}/accept`).set(auth(rider));
  return { rider, passenger, ride, booking: acceptRes.body.data };
}

const startRide = (rider, ride) => request(app).post(`/api/rides/${ride.id}/start`).set(auth(rider));
const sendOtp = (rider, booking) => request(app).post(`/api/bookings/${booking.id}/pickup-otp`).set(auth(rider));
const verify = (user, booking, otp) =>
  request(app).post(`/api/bookings/${booking.id}/verify-pickup`).set(auth(user)).send({ otp });

async function latestOtpFor(passenger) {
  const res = await request(app).get("/api/notifications").set(auth(passenger));
  const note = res.body.data.find((n) => n.type === "PICKUP_OTP");
  return note?.message.match(/\b(\d{6})\b/)?.[1];
}

describe("Pickup OTP boarding flow", () => {
  it("starts a confirmed booking as NOT_BOARDED", async () => {
    const { booking } = await confirmedBooking();
    expect(booking.bookingStatus).toBe("CONFIRMED");
    expect(booking.boardingStatus).toBe("NOT_BOARDED");
  });

  it("won't send an OTP before the ride has started", async () => {
    const { rider, booking } = await confirmedBooking();
    const res = await sendOtp(rider, booking);
    expect(res.status).toBe(409);
  });

  it("only the ride's owner can send the OTP", async () => {
    const { rider, passenger, ride, booking } = await confirmedBooking();
    await startRide(rider, ride);
    const stranger = await registerUser();
    expect((await sendOtp(stranger, booking)).status).toBe(403);
    expect((await sendOtp(passenger, booking)).status).toBe(403);
  });

  it("sends the OTP to the passenger only, never to the rider", async () => {
    const { rider, passenger, ride, booking } = await confirmedBooking();
    await startRide(rider, ride);

    const res = await sendOtp(rider, booking);
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toMatch(/\b\d{6}\b/);
    expect(res.body.data.boardingStatus).toBe("OTP_SENT");

    expect(await latestOtpFor(passenger)).toMatch(/^\d{6}$/);
    const riderNotes = await request(app).get("/api/notifications").set(auth(rider));
    expect(riderNotes.body.data.some((n) => n.type === "PICKUP_OTP")).toBe(false);

    // The stored booking never exposes the OTP or its hash.
    const bookingRes = await request(app).get(`/api/bookings/${booking.id}`).set(auth(rider));
    expect(bookingRes.body.data.boardingStatus).toBe("OTP_SENT");
    expect(JSON.stringify(bookingRes.body)).not.toMatch(/hash/i);
  });

  it("limits how often an OTP can be re-sent", async () => {
    const { rider, ride, booking } = await confirmedBooking();
    await startRide(rider, ride);
    expect((await sendOtp(rider, booking)).status).toBe(200);
    expect((await sendOtp(rider, booking)).status).toBe(409);
  });

  it("rejects a wrong OTP, counts attempts, then locks", async () => {
    const { rider, passenger, ride, booking } = await confirmedBooking();
    await startRide(rider, ride);
    await sendOtp(rider, booking);
    const real = await latestOtpFor(passenger);
    const wrong = real === "000000" ? "111111" : "000000";

    const first = await verify(passenger, booking, wrong);
    expect(first.status).toBe(400);
    expect(first.body.message).toMatch(/4 attempts left/);
    for (let i = 0; i < 4; i += 1) await verify(passenger, booking, wrong);

    // Even the right code is refused once the attempts are used up.
    const locked = await verify(passenger, booking, real);
    expect(locked.status).toBe(429);
  });

  it("rejects malformed OTPs", async () => {
    const { rider, passenger, ride, booking } = await confirmedBooking();
    await startRide(rider, ride);
    await sendOtp(rider, booking);
    expect((await verify(passenger, booking, "12ab")).status).toBe(400);
  });

  it("rejects an expired OTP", async () => {
    const { rider, passenger, ride, booking } = await confirmedBooking();
    await startRide(rider, ride);
    await sendOtp(rider, booking);
    const otp = await latestOtpFor(passenger);
    await pool.query(`UPDATE "bookings" SET "pickup_otp_expires_at" = now() - interval '1 minute' WHERE "id" = $1`, [booking.id]);
    const res = await verify(passenger, booking, otp);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/expired/i);
  });

  it("boards the passenger on the correct OTP and tells the rider", async () => {
    const { rider, passenger, ride, booking } = await confirmedBooking();
    await startRide(rider, ride);

    const stranger = await registerUser();
    await sendOtp(rider, booking);
    const otp = await latestOtpFor(passenger);

    expect((await verify(stranger, booking, otp)).status).toBe(403);

    const res = await verify(passenger, booking, otp);
    expect(res.status).toBe(200);
    expect(res.body.data.boardingStatus).toBe("BOARDED");
    expect(res.body.data.boardedAt).toBeTruthy();

    const riderNotes = await request(app).get("/api/notifications").set(auth(rider));
    expect(riderNotes.body.data.some((n) => n.type === "PASSENGER_BOARDED")).toBe(true);

    // Already on board: no further OTPs, and the code can't be replayed.
    expect((await sendOtp(rider, booking)).status).toBe(409);
    expect((await verify(passenger, booking, otp)).status).toBe(200);
  });

  it("verifying before any OTP was sent is refused", async () => {
    const { rider, passenger, ride, booking } = await confirmedBooking();
    await startRide(rider, ride);
    expect((await verify(passenger, booking, "123456")).status).toBe(409);
  });

  it("shows boarding state in the rider's request list", async () => {
    const { rider, ride } = await confirmedBooking();
    const list = await request(app).get(`/api/rides/${ride.id}/requests`).set(auth(rider));
    expect(list.body.data[0].booking.boardingStatus).toBe("NOT_BOARDED");
  });
});

// ---------------------------------------------------------------------------
// Drop-off OTP and the rider's payout
// ---------------------------------------------------------------------------
const sendDropOtp = (rider, booking) => request(app).post(`/api/bookings/${booking.id}/drop-otp`).set(auth(rider));
const verifyDrop = (user, booking, otp) =>
  request(app).post(`/api/bookings/${booking.id}/verify-drop`).set(auth(user)).send({ otp });

async function latestOtpOfType(user, type) {
  const res = await request(app).get("/api/notifications").set(auth(user));
  const note = res.body.data.find((n) => n.type === type);
  return note?.message.match(/(\d{6})/)?.[1];
}

async function paidBooking() {
  const rider = await registerUser();
  const passenger = await registerUser();
  const vehicle = await createVehicle(rider.token);
  const ride = await createPublishedRide(rider.token, vehicle.id, { availableSeats: 1, rideType: "WITH_TIP", tipAmount: 50 });
  const reqRes = await request(app).post(`/api/rides/${ride.id}/requests`).set(auth(passenger)).send({ ...pickupDrop, seatsRequested: 1 });
  const accept = await request(app).put(`/api/ride-requests/${reqRes.body.data.id}/accept`).set(auth(rider));
  return { rider, passenger, ride, booking: accept.body.data };
}

async function pay(passenger, booking) {
  const order = (await request(app).post("/api/payments/orders").set(auth(passenger)).send({ bookingId: booking.id })).body.data;
  return request(app)
    .post("/api/payments/verify")
    .set(auth(passenger))
    .send({ bookingId: booking.id, providerOrderId: order.orderId, providerPaymentId: order.providerPaymentId, signature: order.mockSignature });
}

describe("Payment, drop-off OTP and rider payout", () => {
  it("gives no OTP until the passenger has paid", async () => {
    const { rider, ride, booking } = await paidBooking();
    expect(booking.bookingStatus).toBe("PAYMENT_PENDING");
    const res = await sendOtp(rider, booking);
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/payment/i);
    expect(ride.status).toBe("PUBLISHED");
  });

  it("holds the rider's share on payment, then releases it only after the drop OTP", async () => {
    const { rider, passenger, ride, booking } = await paidBooking();

    const paid = await pay(passenger, booking);
    expect(paid.status).toBe(200);
    expect(paid.body.data.riderPayoutStatus).toBe("HELD");
    expect(Number(paid.body.data.riderPayoutAmount)).toBe(50);

    await startRide(rider, ride);

    // pickup
    const sent = await sendOtp(rider, booking);
    if (sent.status !== 200) throw new Error(`sendOtp ${sent.status} ${JSON.stringify(sent.body)}`);
    const pickupOtp = await latestOtpOfType(passenger, "PICKUP_OTP");
    expect((await verify(passenger, booking, pickupOtp)).body.data.boardingStatus).toBe("BOARDED");

    // can't complete the ride while the passenger is still on board
    const early = await request(app).post(`/api/rides/${ride.id}/complete`).set(auth(rider));
    expect(early.status).toBe(409);

    // the pickup OTP can't be reused as a drop OTP, and a drop OTP can't be asked for twice too fast
    expect((await verifyDrop(passenger, booking, pickupOtp)).status).toBe(409);
    expect((await sendDropOtp(rider, booking)).status).toBe(200);
    expect((await sendDropOtp(rider, booking)).status).toBe(409);

    const dropOtp = await latestOtpOfType(passenger, "DROP_OTP");
    expect(dropOtp).toMatch(/^\d{6}$/);

    // payout still held until the passenger confirms
    const mid = await request(app).get(`/api/bookings/${booking.id}`).set(auth(rider));
    expect(mid.body.data.riderPayoutStatus).toBe("HELD");
    const riderBefore = await request(app).get("/api/notifications").set(auth(rider));
    expect(riderBefore.body.data.some((n) => n.type === "PAYOUT_RECEIVED")).toBe(false);

    const wrong = dropOtp === "000000" ? "111111" : "000000";
    expect((await verifyDrop(passenger, booking, wrong)).status).toBe(400);

    const dropped = await verifyDrop(passenger, booking, dropOtp);
    expect(dropped.status).toBe(200);
    expect(dropped.body.data.boardingStatus).toBe("DROPPED");
    expect(dropped.body.data.riderPayoutStatus).toBe("RELEASED");
    expect(dropped.body.data.riderPayoutReleasedAt).toBeTruthy();

    const riderAfter = await request(app).get("/api/notifications").set(auth(rider));
    expect(riderAfter.body.data.some((n) => n.type === "PAYOUT_RECEIVED" && /50/.test(n.message))).toBe(true);
    expect(riderAfter.body.data.some((n) => n.type === "PASSENGER_DROPPED")).toBe(true);

    // now the ride can be completed
    const done = await request(app).post(`/api/rides/${ride.id}/complete`).set(auth(rider));
    expect(done.status).toBe(200);
  });

  it("won't send a drop OTP before the passenger has boarded", async () => {
    const { rider, ride, booking } = await confirmedBooking();
    await startRide(rider, ride);
    const res = await sendDropOtp(rider, booking);
    expect(res.status).toBe(409);
  });

  it("refunds instead of paying the rider when a held booking is cancelled", async () => {
    const { rider, passenger, booking } = await paidBooking();
    await pay(passenger, booking);
    await request(app).post(`/api/bookings/${booking.id}/cancel`).set(auth(passenger)).send({ reason: "changed plans" });
    const res = await request(app).get(`/api/bookings/${booking.id}`).set(auth(rider));
    expect(["REFUNDED", "HELD"]).toContain(res.body.data.riderPayoutStatus);
    expect(res.body.data.paymentStatus).toBe("REFUNDED");
    expect(res.body.data.riderPayoutStatus).toBe("REFUNDED");
  });
});
