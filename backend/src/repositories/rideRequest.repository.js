import crypto from "node:crypto";
import { pool } from "../config/db.js";
import { toCamelRow, updateRow, insertRow, nestPrefixed } from "../utils/sqlRows.js";

const RR_COLUMNS = `
  rr."id", rr."ride_id", rr."passenger_id", rr."pickup_name", rr."pickup_latitude", rr."pickup_longitude",
  rr."drop_name", rr."drop_latitude", rr."drop_longitude", rr."seats_requested", rr."status", rr."message",
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
              ROUND((ST_Distance(
                COALESCE(r.route_geog, ST_MakeLine(r.source_geog::geometry, r.destination_geog::geometry)::geography),
                rr.pickup_geog
              ) / 1000)::numeric, 1)::float8 AS "pickup_distance_km"
       FROM "ride_requests" rr
       JOIN "users" u ON u."id" = rr."passenger_id"
       JOIN "rides" r ON r."id" = rr."ride_id"
       WHERE rr."ride_id" = $1 ORDER BY rr."created_at" DESC`,
      [rideId]
    );
    return rows.map((row) => nestPrefixed(row, { passenger: "passenger" }));
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

  /** { rideId: status } for the passenger's active requests among the given rides. */
  async activeStatusByRideIds(passengerId, rideIds) {
    if (!passengerId || rideIds.length === 0) return new Map();
    const { rows } = await pool.query(
      `SELECT "ride_id", "status" FROM "ride_requests"
       WHERE "passenger_id" = $1 AND "ride_id" = ANY($2) AND "status" = ANY($3::"RideRequestStatus"[])`,
      [passengerId, rideIds, ["REQUESTED", "ACCEPTED"]]
    );
    return new Map(rows.map((r) => [r.ride_id, r.status]));
  },

  /**
   * Once a passenger is accepted on one ride, their other still-pending
   * requests for rides leaving around the same time (same day, within
   * `windowMinutes`) are withdrawn so a second rider can't also accept them
   * and double-book the passenger. A return trip later that day is untouched.
   */
  async cancelOverlappingPending(passengerId, acceptedRideId, windowMinutes, tx) {
    const { rows } = await (tx || pool).query(
      `UPDATE "ride_requests" rr SET "status" = 'CANCELLED', "updated_at" = now()
       FROM "rides" r, "rides" accepted
       WHERE rr."ride_id" = r."id" AND accepted."id" = $2
         AND rr."passenger_id" = $1 AND rr."ride_id" <> $2 AND rr."status" = 'REQUESTED'
         AND r."departure_date" = accepted."departure_date"
         AND ABS((split_part(r."departure_time", ':', 1)::int * 60 + split_part(r."departure_time", ':', 2)::int) - (split_part(accepted."departure_time", ':', 1)::int * 60 + split_part(accepted."departure_time", ':', 2)::int)) < $3
       RETURNING rr."id", rr."ride_id" AS "rideId"`,
      [passengerId, acceptedRideId, windowMinutes]
    );
    return rows;
  },

  /** When a ride starts, requests the rider never answered can no longer be accepted. */
  async expirePendingForRide(rideId, tx) {
    const { rows } = await (tx || pool).query(
      `UPDATE "ride_requests" SET "status" = 'EXPIRED', "updated_at" = now()
       WHERE "ride_id" = $1 AND "status" = 'REQUESTED'
       RETURNING "id", "passenger_id" AS "passengerId"`,
      [rideId]
    );
    return rows;
  },

  async updateStatus(id, status, tx) {
    const { text, values } = updateRow("ride_requests", id, { status, updatedAt: new Date() });
    const { rows } = await (tx || pool).query(text, values);
    return toCamelRow(rows[0]);
  },
};
