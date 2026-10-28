import crypto from "node:crypto";
import { env } from "../config/env.js";
import { bookingRepository } from "../repositories/booking.repository.js";
import { ApiError } from "../utils/ApiError.js";
import { audit } from "../utils/audit.js";
import { notificationService } from "./notification.service.js";

// A passenger joins and leaves the rider with two one-time OTPs:
//   pickup - the rider, once they've met the passenger, sends an OTP; the
//            passenger enters it in the app and is then on board.
//   drop   - at the drop-off the rider sends a second OTP; the passenger
//            entering it confirms the drop, and only then is the rider paid.
// Only a keyed hash of an OTP is stored. There is one active OTP per booking.
const OTP_VALID_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 30;

const STAGES = {
  PICKUP: {
    from: ["NOT_BOARDED", "OTP_SENT"], // statuses the rider may (re)send from
    sent: "OTP_SENT",
    notificationType: "PICKUP_OTP",
    title: "Your pickup OTP",
    verb: "meet",
    rideMessage: "Start the ride before picking up passengers",
  },
  DROP: {
    from: ["BOARDED", "DROP_OTP_SENT"],
    sent: "DROP_OTP_SENT",
    notificationType: "DROP_OTP",
    title: "Your drop-off OTP",
    verb: "reach your drop-off with",
    rideMessage: "The ride isn't under way",
  },
};

function hashOtp(otp, bookingId) {
  return crypto.createHmac("sha256", env.jwtSecret).update(`${bookingId}:${otp}`).digest("hex");
}

function safeEqual(a, b) {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

async function loadBooking(bookingId) {
  const booking = await bookingRepository.findById(bookingId);
  if (!booking) throw ApiError.notFound("Booking not found");
  return booking;
}

async function sendOtp(riderId, bookingId, stageName) {
  const stage = STAGES[stageName];
  const booking = await loadBooking(bookingId);
  if (booking.ride.riderId !== riderId) throw ApiError.forbidden("You do not own this ride");
  if (booking.bookingStatus !== "CONFIRMED") {
    throw ApiError.conflict(
      booking.bookingStatus === "PAYMENT_PENDING"
        ? "This passenger hasn't completed payment yet. They get their OTP only after paying"
        : "This booking is not active"
    );
  }
  if (booking.ride.status !== "STARTED") throw ApiError.conflict(stage.rideMessage);
  if (!stage.from.includes(booking.boardingStatus)) {
    if (booking.boardingStatus === "DROPPED") throw ApiError.conflict("This passenger has already been dropped off");
    if (stageName === "PICKUP") throw ApiError.conflict("This passenger is already on board");
    throw ApiError.conflict("The passenger hasn't boarded yet");
  }

  const state = await bookingRepository.getPickupOtpState(bookingId);
  if (state?.sentAt && booking.boardingStatus === stage.sent) {
    const waitSeconds = RESEND_COOLDOWN_SECONDS - Math.floor((Date.now() - new Date(state.sentAt).getTime()) / 1000);
    if (waitSeconds > 0) throw ApiError.conflict(`Please wait ${waitSeconds}s before sending another OTP`);
  }

  const otp = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  const expiresAt = new Date(Date.now() + OTP_VALID_MINUTES * 60 * 1000);
  await bookingRepository.saveOtp(bookingId, { hash: hashOtp(otp, bookingId), expiresAt, status: stage.sent });

  // In-app delivery for now; an SMS/WhatsApp provider would be plugged in
  // here. The rider's response deliberately never contains the code.
  await notificationService.dispatch({
    userId: booking.passengerId,
    type: stage.notificationType,
    title: stage.title,
    message: `${stage.title} is ${otp}. Enter it in the app when you ${stage.verb} ${booking.ride.rider?.firstName || "your rider"}. Valid for ${OTP_VALID_MINUTES} minutes - don't share it with anyone else.`,
    data: { rideId: booking.rideId, bookingId },
  });
  await audit(null, { userId: riderId, action: `${stageName}_OTP_SENT`, entityType: "Booking", entityId: bookingId });

  return { boardingStatus: stage.sent, expiresAt, resendAfterSeconds: RESEND_COOLDOWN_SECONDS };
}

async function verifyOtp(passengerId, bookingId, otp, stageName) {
  const stage = STAGES[stageName];
  const booking = await loadBooking(bookingId);
  if (booking.passengerId !== passengerId) throw ApiError.forbidden("You do not own this booking");
  if (booking.bookingStatus !== "CONFIRMED") throw ApiError.conflict("This booking is not active");
  if (booking.ride.status !== "STARTED") throw ApiError.conflict("The ride isn't under way");
  const done = stageName === "PICKUP" ? ["BOARDED", "DROP_OTP_SENT", "DROPPED"] : ["DROPPED"];
  if (done.includes(booking.boardingStatus)) return booking;
  if (booking.boardingStatus !== stage.sent) {
    throw ApiError.conflict(`Your rider hasn't sent a ${stageName === "PICKUP" ? "pickup" : "drop-off"} OTP yet`);
  }

  const state = await bookingRepository.getPickupOtpState(bookingId);
  if (!state?.hash || !state.expiresAt || new Date(state.expiresAt).getTime() < Date.now()) {
    throw ApiError.badRequest("This OTP has expired. Ask your rider to send a new one");
  }
  if (state.attempts >= MAX_ATTEMPTS) {
    throw ApiError.tooManyRequests("Too many wrong attempts. Ask your rider to send a new OTP");
  }
  if (!safeEqual(hashOtp(otp, bookingId), state.hash)) {
    const attempts = await bookingRepository.bumpPickupOtpAttempts(bookingId);
    const left = MAX_ATTEMPTS - attempts;
    throw ApiError.badRequest(
      left > 0 ? `Incorrect OTP. ${left} attempt${left === 1 ? "" : "s"} left` : "Incorrect OTP. Ask your rider to send a new one"
    );
  }

  const name = booking.passenger?.firstName || "Your passenger";
  if (stageName === "PICKUP") {
    const boarded = await bookingRepository.markBoarded(bookingId);
    await audit(null, { userId: passengerId, action: "PASSENGER_BOARDED", entityType: "Booking", entityId: bookingId });
    await notificationService.dispatch({
      userId: booking.ride.riderId,
      type: "PASSENGER_BOARDED",
      title: "Passenger on board",
      message: `${name} has joined your ride`,
      data: { rideId: booking.rideId, bookingId },
    });
    return boarded;
  }

  const dropped = await bookingRepository.markDropped(bookingId);
  await audit(null, { userId: passengerId, action: "PASSENGER_DROPPED", entityType: "Booking", entityId: bookingId });
  await notificationService.dispatch({
    userId: booking.ride.riderId,
    type: "PASSENGER_DROPPED",
    title: "Passenger dropped off",
    message: `${name} has been dropped off`,
    data: { rideId: booking.rideId, bookingId },
  });
  // Payment reaches the rider only now, once the passenger confirms the drop.
  if (dropped.riderPayoutStatus === "RELEASED") {
    await notificationService.dispatch({
      userId: booking.ride.riderId,
      type: "PAYOUT_RECEIVED",
      title: "Payment received",
      message: `You received ₹${Number(dropped.riderPayoutAmount)} for dropping off ${name}`,
      data: { rideId: booking.rideId, bookingId },
    });
  }
  return dropped;
}

export const boardingService = {
  sendPickupOtp: (riderId, bookingId) => sendOtp(riderId, bookingId, "PICKUP"),
  sendDropOtp: (riderId, bookingId) => sendOtp(riderId, bookingId, "DROP"),
  verifyPickupOtp: (passengerId, bookingId, otp) => verifyOtp(passengerId, bookingId, otp, "PICKUP"),
  verifyDropOtp: (passengerId, bookingId, otp) => verifyOtp(passengerId, bookingId, otp, "DROP"),
};
