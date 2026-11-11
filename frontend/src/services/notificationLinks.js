// Where tapping a notification should take the user. Payment reminders open
// the booking with the payment sheet already up; anything about a booking
// (OTPs, payment, cancellations) opens that booking; anything about a ride
// opens the ride. Returns null when there's nowhere useful to go.
export function notificationLink(n) {
  const data = n?.data || {};
  if (data.feedbackId) return { to: "/feedback" };
  if (data.bookingId) {
    return { to: `/bookings/${data.bookingId}`, state: n.type === "PAYMENT_REQUIRED" ? { pay: true } : n.type === "RATE_DRIVER" ? { rate: true } : undefined };
  }
  if (data.rideId) {
    return { to: n.type === "RIDE_REQUEST_CREATED" ? `/rides/${data.rideId}/requests` : `/rides/${data.rideId}` };
  }
  return null;
}
