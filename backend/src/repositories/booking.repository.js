import crypto from "node:crypto";
import { pool } from "../config/db.js";
import { toCamel, toCamelRows, insertRow, updateRow } from "../utils/sqlRows.js";

const BOOKING_JOIN_SELECT = `
  b."id", b."ride_id", b."passenger_id", b."ride_request_id", b."seats", b."tip_amount", b."platform_fee",
  b."total_amount", b."booking_status", b."payment_status", b."cancelled_at", b."cancel_reason",
  b."created_at", b."updated_at",
  ride."id" AS "ride__id", ride."rider_id" AS "ride__rider_id", ride."vehicle_id" AS "ride__vehicle_id",
  ride."source_name" AS "ride__source_name", ride."source_latitude" AS "ride__source_latitude",
  ride."source_longitude" AS "ride__source_longitude", ride."destination_name" AS "ride__destination_name",
  ride."destination_latitude" AS "ride__destination_latitude", ride."destination_longitude" AS "ride__destination_longitude",
  ride."departure_date" AS "ride__departure_date", ride."departure_time" AS "ride__departure_time",
  ride."available_seats" AS "ride__available_seats", ride."total_seats" AS "ride__total_seats",
  ride."ride_type" AS "ride__ride_type", ride."tip_amount" AS "ride__tip_amount", ride."notes" AS "ride__notes",
  ride."status" AS "ride__status", ride."started_at" AS "ride__started_at", ride."completed_at" AS "ride__completed_at",
  ride."cancelled_at" AS "ride__cancelled_at", ride."created_at" AS "ride__created_at", ride."updated_at" AS "ride__updated_at",
  v."id" AS "ride_vehicle__id", v."owner_id" AS "ride_vehicle__owner_id", v."vehicle_type" AS "ride_vehicle__vehicle_type",
  v."brand" AS "ride_vehicle__brand", v."model" AS "ride_vehicle__model",
  v."registration_number" AS "ride_vehicle__registration_number", v."color" AS "ride_vehicle__color",
  v."manufacturing_year" AS "ride_vehicle__manufacturing_year", v."verification_status" AS "ride_vehicle__verification_status",
  v."is_active" AS "ride_vehicle__is_active", v."created_at" AS "ride_vehicle__created_at",
  v."updated_at" AS "ride_vehicle__updated_at",
  ur."id" AS "ride_rider__id", ur."first_name" AS "ride_rider__first_name", ur."last_name" AS "ride_rider__last_name",
  ur."profile_image" AS "ride_rider__profile_image",
  up."id" AS "passenger__id", up."first_name" AS "passenger__first_name", up."last_name" AS "passenger__last_name",
  up."profile_image" AS "passenger__profile_image"
`;
const BOOKING_JOIN_FROM = `
  FROM "bookings" b
  JOIN "rides" ride ON ride."id" = b."ride_id"
  JOIN "vehicles" v ON v."id" = ride."vehicle_id"
  JOIN "users" ur ON ur."id" = ride."rider_id"
  JOIN "users" up ON up."id" = b."passenger_id"
`;

function hydrateBookingRow(row) {
  const booking = {};
  const ride = {};
  const rideVehicle = {};
  const rideRider = {};
  const passenger = {};
  for (const [col, value] of Object.entries(row)) {
    if (col.startsWith("ride_vehicle__")) rideVehicle[toCamel(col.slice("ride_vehicle__".length))] = value;
    else if (col.startsWith("ride_rider__")) rideRider[toCamel(col.slice("ride_rider__".length))] = value;
    else if (col.startsWith("ride__")) ride[toCamel(col.slice("ride__".length))] = value;
    else if (col.startsWith("passenger__")) passenger[toCamel(col.slice("passenger__".length))] = value;
    else booking[toCamel(col)] = value;
  }
  ride.vehicle = rideVehicle.id != null ? rideVehicle : null;
  ride.rider = rideRider.id != null ? rideRider : null;
  booking.ride = ride.id != null ? ride : null;
  booking.passenger = passenger.id != null ? passenger : null;
  return booking;
}

async function attachPayments(client, bookings) {
  if (bookings.length === 0) return bookings;
  const ids = bookings.map((b) => b.id);
  const { rows } = await client.query(
    'SELECT * FROM "payments" WHERE "booking_id" = ANY($1) ORDER BY "created_at" ASC',
    [ids]
  );
  const paymentsByBooking = new Map();
  for (const payment of toCamelRows(rows)) {
    const list = paymentsByBooking.get(payment.bookingId) || [];
    list.push(payment);
    paymentsByBooking.set(payment.bookingId, list);
  }
  for (const booking of bookings) booking.payments = paymentsByBooking.get(booking.id) || [];
  return bookings;
}

async function selectById(client, id) {
  const { rows } = await client.query(
    `SELECT ${BOOKING_JOIN_SELECT} ${BOOKING_JOIN_FROM} WHERE b."id" = $1 LIMIT 1`,
    [id]
  );
  if (!rows[0]) return null;
  const [booking] = await attachPayments(client, [hydrateBookingRow(rows[0])]);
  return booking;
}

export const bookingRepository = {
  async create(tx, data) {
    const client = tx || pool;
    const now = new Date();
    const { text, values } = insertRow("bookings", { id: crypto.randomUUID(), ...data, createdAt: now, updatedAt: now });
    const { rows } = await client.query(text, values);
    return selectById(client, rows[0].id);
  },

  async findById(id, tx) {
    return selectById(tx || pool, id);
  },

  async findByPassenger(passengerId) {
    const { rows } = await pool.query(
      `SELECT ${BOOKING_JOIN_SELECT} ${BOOKING_JOIN_FROM} WHERE b."passenger_id" = $1 ORDER BY b."created_at" DESC`,
      [passengerId]
    );
    return attachPayments(pool, rows.map(hydrateBookingRow));
  },

  async findByRideRequestId(rideRequestId, tx) {
    const client = tx || pool;
    const { rows } = await client.query(
      `SELECT ${BOOKING_JOIN_SELECT} ${BOOKING_JOIN_FROM} WHERE b."ride_request_id" = $1 LIMIT 1`,
      [rideRequestId]
    );
    if (!rows[0]) return null;
    const [booking] = await attachPayments(client, [hydrateBookingRow(rows[0])]);
    return booking;
  },

  async update(id, data, tx) {
    const client = tx || pool;
    const { text, values } = updateRow("bookings", id, { ...data, updatedAt: new Date() });
    await client.query(text, values);
    return selectById(client, id);
  },

  async hasConfirmedForRide(rideId, passengerId) {
    const { rows } = await pool.query(
      'SELECT "id" FROM "bookings" WHERE "ride_id" = $1 AND "passenger_id" = $2 AND "booking_status" = $3 LIMIT 1',
      [rideId, passengerId, "CONFIRMED"]
    );
    return rows.length > 0;
  },

  /** Bulk-cancels every active booking on a ride; replaces the inline tx.booking.updateMany(...) that used to live in ride.service.js#cancel. */
  async cancelAllForRide(rideId, reason, tx) {
    await (tx || pool).query(
      `UPDATE "bookings"
       SET "booking_status" = 'CANCELLED', "cancelled_at" = now(), "cancel_reason" = $1, "updated_at" = now()
       WHERE "ride_id" = $2 AND "booking_status" = ANY($3::"BookingStatus"[])`,
      [reason, rideId, ["PAYMENT_PENDING", "CONFIRMED"]]
    );
  },

  /** Used by notification.service.js when a ride starts/completes. */
  async findConfirmedByRide(rideId) {
    const { rows } = await pool.query(
      `SELECT b."id", b."passenger_id" AS "passengerId", r."destination_name" AS "rideDestinationName"
       FROM "bookings" b JOIN "rides" r ON r."id" = b."ride_id"
       WHERE b."ride_id" = $1 AND b."booking_status" = 'CONFIRMED'`,
      [rideId]
    );
    return rows;
  },

  /** Used by notification.service.js when a ride is cancelled. */
  async findActiveByRide(rideId) {
    const { rows } = await pool.query(
      `SELECT "id", "passenger_id" AS "passengerId"
       FROM "bookings" WHERE "ride_id" = $1 AND "booking_status" = ANY($2::"BookingStatus"[])`,
      [rideId, ["PAYMENT_PENDING", "CONFIRMED"]]
    );
    return rows;
  },
};
