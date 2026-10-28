import crypto from "node:crypto";
import { pool } from "../config/db.js";
import { toCamelRow, updateRow, insertRow, nestPrefixed } from "../utils/sqlRows.js";

const RR_COLUMNS = `
  rr."id", rr."ride_id", rr."passenger_id", rr."pickup_name", rr."pickup_latitude", rr."pickup_longitude",
  rr."drop_name", rr."drop_latitude", rr."drop_longitude", rr."seats_requested", rr."status", rr."message",
  rr."pickup_zone", rr."pickup_distance_km", rr."extra_tip",
  rr."created_at", rr."updated_at"
`;
const PASSENGER_COLUMNS = `
  u."id" AS "passenger__id", u."first_name" AS "passenger__first_name", u."last_name" AS "passenger__last_name",
  u."profile_image" AS "passenger__profile_image"
`;
const RIDE_FLAT_COLUMNS = `
  ride."id" AS "ride__id", ride."rider_id" AS "ride__rider_id", ride."vehicle_id" AS "ride__vehicle_id",
  ride."source_name" AS "ride__source_name", ride."source_latitude" AS "ride__source_latitude",
  ride."source_longitude" AS "ride__source_longitude", ride."destination_name" AS "ride__destination_name",
  ride."destination_latitude" AS "ride__destination_latitude", ride."destination_longitude" AS "ride__destination_longitude",
  ride."departure_date" AS "ride__departure_date", ride."departure_time" AS "ride__departure_time",
  ride."available_seats" AS "ride__available_seats", ride."total_seats" AS "ride__total_seats",
  ride."ride_type" AS "ride__ride_type", ride."tip_amount" AS "ride__tip_amount", ride."notes" AS "ride__notes",
  ride."status" AS "ride__status", ride."started_at" AS "ride__started_at", ride."completed_at" AS "ride__completed_at",
  ride."cancelled_at" AS "ride__cancelled_at", ride."created_at" AS "ride__created_at", ride."updated_at" AS "ride__updated_at"
`;

async function findByIdWithPassenger(id) {
  const { rows } = await pool.query(
    `SELECT ${RR_COLUMNS}, ${PASSENGER_COLUMNS}
     FROM "ride_requests" rr JOIN "users" u ON u."id" = rr."passenger_id"
     WHERE rr."id" = $1 LIMIT 1`,
    [id]
  );
  return rows[0] ? nestPrefixed(rows[0], { passenger: "passenger" }) : null;
}

export const rideRequestRepository = {
  async create(rideId, passengerId, data) {
    const now = new Date();
    const { text, values } = insertRow("ride_requests", {
      id: crypto.randomUUID(),
      rideId,
      passengerId,
      ...data,
      createdAt: now,
      updatedAt: now,
    });
    const { rows } = await pool.query(text, values);
    return findByIdWithPassenger(rows[0].id);
  },

  async findById(id) {
    const { rows } = await pool.query(
      `SELECT ${RR_COLUMNS}, ${PASSENGER_COLUMNS}, ${RIDE_FLAT_COLUMNS}
       FROM "ride_requests" rr
       JOIN "users" u ON u."id" = rr."passenger_id"
       JOIN "rides" ride ON ride."id" = rr."ride_id"
       WHERE rr."id" = $1 LIMIT 1`,
      [id]
    );
    return rows[0] ? nestPrefixed(rows[0], { passenger: "passenger", ride: "ride" }) : null;
  },

  async findByRide(rideId) {
    const { rows } = await pool.query(
      `SELECT ${RR_COLUMNS}, ${PASSENGER_COLUMNS},
              b."id" AS "booking__id", b."booking_status" AS "booking__booking_status",
              b."payment_status" AS "booking__payment_status", b."boarding_status" AS "booking__boarding_status",
              b."pickup_otp_sent_at" AS "booking__pickup_otp_sent_at",
              b."pickup_otp_expires_at" AS "booking__pickup_otp_expires_at", b."boarded_at" AS "booking__boarded_at",
              b."dropped_at" AS "booking__dropped_at", b."rider_payout_status" AS "booking__rider_payout_status",
              b."rider_payout_amount" AS "booking__rider_payout_amount"
       FROM "ride_requests" rr
       JOIN "users" u ON u."id" = rr."passenger_id"
       LEFT JOIN "bookings" b ON b."ride_request_id" = rr."id"
       WHERE rr."ride_id" = $1 ORDER BY rr."created_at" DESC`,
      [rideId]
    );
    return rows.map((row) => nestPrefixed(row, { passenger: "passenger", booking: "booking" }));
  },

  async findActiveByRideAndPassenger(rideId, passengerId) {
    const { rows } = await pool.query(
      `SELECT * FROM "ride_requests"
       WHERE "ride_id" = $1 AND "passenger_id" = $2 AND "status" = ANY($3::"RideRequestStatus"[])
       LIMIT 1`,
      [rideId, passengerId, ["REQUESTED", "ACCEPTED"]]
    );
    return toCamelRow(rows[0]) || null;
  },

  /** The passenger's active (REQUESTED/ACCEPTED) requests on any of these rides. */
  async findActiveByPassengerForRides(passengerId, rideIds) {
    if (rideIds.length === 0) return [];
    const { rows } = await pool.query(
      `SELECT "id", "ride_id", "status" FROM "ride_requests"
       WHERE "passenger_id" = $1 AND "ride_id" = ANY($2::text[]) AND "status" = ANY($3::"RideRequestStatus"[])`,
      [passengerId, rideIds, ["REQUESTED", "ACCEPTED"]]
    );
    return rows.map(toCamelRow);
  },

  /**
   * Closes every open (REQUESTED / ACCEPTED) request on a ride with `status`.
   * Returns the closed rows so their passengers can be told.
   */
  async closeOpenForRide(rideId, status, tx) {
    const { rows } = await (tx || pool).query(
      `UPDATE "ride_requests" SET "status" = $2::"RideRequestStatus", "updated_at" = now()
       WHERE "ride_id" = $1 AND "status" = ANY($3::"RideRequestStatus"[])
       RETURNING "id", "passenger_id" AS "passengerId"`,
      [rideId, status, ["REQUESTED", "ACCEPTED"]]
    );
    return rows;
  },

  async updateStatus(id, status, tx) {
    const { text, values } = updateRow("ride_requests", id, { status, updatedAt: new Date() });
    const { rows } = await (tx || pool).query(text, values);
    return toCamelRow(rows[0]);
  },
};
