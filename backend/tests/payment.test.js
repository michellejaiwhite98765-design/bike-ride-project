import { describe, it, expect } from "@jest/globals";
import { request, app, registerUser, createVehicle, createPublishedRide } from "./helpers.js";

const pickupDrop = {
  pickupName: "Pickup",
  pickupLatitude: 13.1147,
  pickupLongitude: 80.1,
  dropName: "Drop",
  dropLatitude: 13.0827,
  dropLongitude: 80.2707,
};

async function paymentPendingBooking() {
  const rider = await registerUser();
  const passenger = await registerUser();
  const vehicle = await createVehicle(rider.token);
  const ride = await createPublishedRide(rider.token, vehicle.id, {
    availableSeats: 1,
    rideType: "WITH_TIP",
    tipAmount: 50,
  });

  const reqRes = await request(app)
    .post(`/api/rides/${ride.id}/requests`)
    .set("Authorization", `Bearer ${passenger.token}`)
    .send({ ...pickupDrop, seatsRequested: 1 });
  const acceptRes = await request(app)
    .put(`/api/ride-requests/${reqRes.body.data.id}/accept`)
    .set("Authorization", `Bearer ${rider.token}`);

  return { rider, passenger, booking: acceptRes.body.data };
}

describe("Paid ride flow", () => {
  it("puts a WITH_TIP booking into PAYMENT_PENDING with a backend-computed total", async () => {
    const { booking } = await paymentPendingBooking();
    expect(booking.bookingStatus).toBe("PAYMENT_PENDING");
    expect(booking.paymentStatus).toBe("PENDING");
    expect(Number(booking.tipAmount)).toBe(50);
    expect(Number(booking.totalAmount)).toBe(Number(booking.tipAmount) + Number(booking.platformFee));
  });

  it("confirms the booking after a verified payment", async () => {
    const { passenger, booking } = await paymentPendingBooking();

    const orderRes = await request(app)
      .post("/api/payments/orders")
      .set("Authorization", `Bearer ${passenger.token}`)
      .send({ bookingId: booking.id });
    expect(orderRes.status).toBe(200);

    const verifyRes = await request(app)
      .post("/api/payments/verify")
      .set("Authorization", `Bearer ${passenger.token}`)
      .send({
        bookingId: booking.id,
        providerOrderId: orderRes.body.data.orderId,
        providerPaymentId: orderRes.body.data.providerPaymentId,
        signature: orderRes.body.data.mockSignature,
      });
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.bookingStatus).toBe("CONFIRMED");
    expect(verifyRes.body.data.paymentStatus).toBe("SUCCESS");
  });

  it("rejects verification with a bad signature", async () => {
    const { passenger, booking } = await paymentPendingBooking();
    const orderRes = await request(app)
      .post("/api/payments/orders")
      .set("Authorization", `Bearer ${passenger.token}`)
      .send({ bookingId: booking.id });

    const verifyRes = await request(app)
      .post("/api/payments/verify")
      .set("Authorization", `Bearer ${passenger.token}`)
      .send({
        bookingId: booking.id,
        providerOrderId: orderRes.body.data.orderId,
        providerPaymentId: orderRes.body.data.providerPaymentId,
        signature: "tampered_signature",
      });
    expect(verifyRes.status).toBe(400);
  });

  it("does not double-process a payment verified twice (idempotency)", async () => {
    const { passenger, booking } = await paymentPendingBooking();
    const orderRes = await request(app)
      .post("/api/payments/orders")
      .set("Authorization", `Bearer ${passenger.token}`)
      .send({ bookingId: booking.id });
    const payload = {
      bookingId: booking.id,
      providerOrderId: orderRes.body.data.orderId,
      providerPaymentId: orderRes.body.data.providerPaymentId,
      signature: orderRes.body.data.mockSignature,
    };

    const first = await request(app).post("/api/payments/verify").set("Authorization", `Bearer ${passenger.token}`).send(payload);
    const second = await request(app).post("/api/payments/verify").set("Authorization", `Bearer ${passenger.token}`).send(payload);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.body.message).toMatch(/already/i);
  });
});
