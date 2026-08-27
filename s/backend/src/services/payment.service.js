import crypto from "node:crypto";
import { withTransaction } from "../config/db.js";
import { env } from "../config/env.js";
import { paymentRepository } from "../repositories/payment.repository.js";
import { bookingRepository } from "../repositories/booking.repository.js";
import { ApiError } from "../utils/ApiError.js";
import { audit } from "../utils/audit.js";
import { notificationService } from "./notification.service.js";

// Mock payment provider standing in for Razorpay/Stripe. The public interface
// (createOrder / verifyPayment / handleWebhook / refundPayment) mirrors a real
// gateway integration so swapping in a real provider only touches this file.
const MOCK_SECRET = env.payment.keySecret || "dev_mock_payment_secret";

function sign(orderId, paymentId) {
  return crypto.createHmac("sha256", MOCK_SECRET).update(`${orderId}|${paymentId}`).digest("hex");
}

export const paymentService = {
  async createOrder(userId, bookingId) {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) throw ApiError.notFound("Booking not found");
    if (booking.passengerId !== userId) throw ApiError.forbidden("You do not own this booking");
    if (booking.ride.rideType !== "WITH_TIP") throw ApiError.badRequest("This ride does not require payment");
    if (booking.paymentStatus === "SUCCESS") throw ApiError.conflict("This booking has already been paid for");

    const idempotencyKey = `booking:${bookingId}`;
    const existing = await paymentRepository.findByIdempotencyKey(idempotencyKey);
    if (existing && existing.status === "PENDING") {
      const providerPaymentId = `pay_mock_${existing.id}`;
      return {
        orderId: existing.providerOrderId,
        amount: Number(existing.amount),
        currency: existing.currency,
        providerPaymentId,
        mockSignature: sign(existing.providerOrderId, providerPaymentId),
      };
    }

    const providerOrderId = `order_mock_${crypto.randomUUID()}`;
    const payment = await paymentRepository.create(null, {
      bookingId,
      idempotencyKey,
      providerOrderId,
      amount: booking.totalAmount,
      status: "PENDING",
    });

    const providerPaymentId = `pay_mock_${payment.id}`;
    return {
      orderId: providerOrderId,
      amount: Number(booking.totalAmount),
      currency: "INR",
      // Mock-only: a real gateway returns this signature to the client only after
      // an actual payment completes. Here the server plays both roles so the flow
      // is fully testable without live payment credentials.
      providerPaymentId,
      mockSignature: sign(providerOrderId, providerPaymentId),
    };
  },

  async verifyPayment(userId, { bookingId, providerOrderId, providerPaymentId, signature }) {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) throw ApiError.notFound("Booking not found");
    if (booking.passengerId !== userId) throw ApiError.forbidden("You do not own this booking");

    const payment = await paymentRepository.findByIdempotencyKey(`booking:${bookingId}`);
    if (!payment || payment.providerOrderId !== providerOrderId) {
      throw ApiError.badRequest("Payment order not found for this booking");
    }

    if (payment.status === "SUCCESS") {
      return { booking, alreadyProcessed: true };
    }

    const expectedSignature = sign(providerOrderId, providerPaymentId);
    if (expectedSignature !== signature) {
      await paymentRepository.update(payment.id, { status: "FAILED", failureReason: "Signature mismatch" });
      throw ApiError.badRequest("Payment verification failed");
    }

    const updatedBooking = await withTransaction(async (tx) => {
      await paymentRepository.update(payment.id, { status: "SUCCESS", providerPaymentId }, tx);
      return bookingRepository.update(bookingId, { bookingStatus: "CONFIRMED", paymentStatus: "SUCCESS" }, tx);
    });

    await audit(null, { userId, action: "PAYMENT_SUCCESSFUL", entityType: "Booking", entityId: bookingId });
    await notificationService.notifyPaymentSuccess(updatedBooking);
    return { booking: updatedBooking, alreadyProcessed: false };
  },

  /**
   * Mock webhook handler: verifies the payload was signed with the webhook secret,
   * then applies the same idempotent success transition verifyPayment uses so a
   * duplicate delivery of the same event can never create two successful payments.
   */
  async handleWebhook(rawBody, signatureHeader) {
    const webhookSecret = env.payment.webhookSecret || "dev_mock_webhook_secret";
    const expected = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
    if (expected !== signatureHeader) throw ApiError.badRequest("Invalid webhook signature");

    const payload = JSON.parse(rawBody);
    const payment = await paymentRepository.findByProviderOrderId(payload.orderId);
    if (!payment) throw ApiError.notFound("Payment not found for webhook order");
    if (payment.status === "SUCCESS") return { alreadyProcessed: true };

    const updatedBooking = await withTransaction(async (tx) => {
      await paymentRepository.update(payment.id, { status: "SUCCESS", providerPaymentId: payload.paymentId }, tx);
      return bookingRepository.update(payment.bookingId, { bookingStatus: "CONFIRMED", paymentStatus: "SUCCESS" }, tx);
    });

    await notificationService.notifyPaymentSuccess(updatedBooking);
    return { alreadyProcessed: false };
  },

  async refundPayment(bookingId) {
    const payment = await paymentRepository.findByIdempotencyKey(`booking:${bookingId}`);
    if (!payment || payment.status !== "SUCCESS") return null;

    const refunded = await withTransaction(async (tx) => {
      const updatedPayment = await paymentRepository.update(
        payment.id,
        { status: "REFUNDED", refundedAmount: payment.amount },
        tx
      );
      await bookingRepository.update(bookingId, { paymentStatus: "REFUNDED" }, tx);
      return updatedPayment;
    });

    await audit(null, { action: "PAYMENT_REFUNDED", entityType: "Booking", entityId: bookingId });
    return refunded;
  },
};
