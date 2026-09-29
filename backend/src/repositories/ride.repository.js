import crypto from "node:crypto";
import { pool } from "../config/db.js";
import { toCamelRow, insertRow, updateRow, nestPrefixed } from "../utils/sqlRows.js";

const RIDE_JOIN_SELECT = `
  r."id", r."rider_id", r."vehicle_id", r."source_name", r."source_latitude", r."source_longitude",
  r."destination_name", r."destination_latitude", r."destination_longitude", r."pickup_preference", r."departure_date", r."departure_time",
  r."available_seats", r."total_seats", r."ride_type", r."tip_amount", r."notes", r."status",
  r."started_at", r."completed_at", r."cancelled_at", r."created_at", r."updated_at",
  v."id" AS "vehicle__id", v."owner_id" AS "vehicle__owner_id", v."vehicle_type" AS "vehicle__vehicle_type",
  v."brand" AS "vehicle__brand", v."model" AS "vehicle__model", v."registration_number" AS "vehicle__registration_number",
  v."color" AS "vehicle__color", v."manufacturing_year" AS "vehicle__manufacturing_year",
  v."seat_capacity" AS "vehicle__seat_capacity",
  v."verification_status" AS "vehicle__verification_status", v."is_active" AS "vehicle__is_active",
  v."created_at" AS "vehicle__created_at", v."updated_at" AS "vehicle__updated_at",
  u."id" AS "rider__id", u."first_name" AS "rider__first_name", u."last_name" AS "rider__last_name",
  u."profile_image" AS "rider__profile_image", u."phone" AS "rider__phone", u."is_verified" AS "rider__is_verified"
`;
const RIDE_JOIN_FROM = `FROM "rides" r JOIN "vehicles" v ON v."id" = r."vehicle_id" JOIN "users" u ON u."id" = r."rider_id"`;

function hydrateRide(row) {
  if (!row) return null;
  return nestPrefixed(row, { vehicle: "vehicle", rider: "rider" });
}

export const rideRepository = {
  async create(riderId, data) {
    const now = new Date();
    const { text, values } = insertRow("rides", {
      id: crypto.randomUUID(),
      riderId,
      vehicleId: data.vehicleId,
      sourceName: data.sourceName,
      sourceLatitude: data.sourceLatitude,
      sourceLongitude: data.sourceLongitude,
      destinationName: data.destinationName,
      destinationLatitude: data.destinationLatitude,
      destinationLongitude: data.destinationLongitude,
      pickupPreference: data.pickupPreference,
      departureDate: data.departureDate,
      departureTime: data.departureTime,
      availableSeats: data.availableSeats,
      totalSeats: data.availableSeats,
      rideType: data.rideType,
      tipAmount: data.tipAmount,
      notes: data.notes,
      createdAt: now,
      updatedAt: now,
    });
    const { rows } = await pool.query(text, values);
    return this.findById(rows[0].id);
  },

  async findById(id) {
    const { rows } = await pool.query(`SELECT ${RIDE_JOIN_SELECT} ${RIDE_JOIN_FROM} WHERE r."id" = $1 LIMIT 1`, [id]);
    return hydrateRide(rows[0]);
  },

  async update(id, data) {
    const { text, values } = updateRow("rides", id, { ...data, updatedAt: new Date() });
    await pool.query(text, values);
    return this.findById(id);
  },

  /** Flat (non-hydrated) update, matching the shape `tx.ride.update()` without an `include` used to return. */
  async updateFlat(id, data, tx) {
    const { text, values } = updateRow("rides", id, { ...data, updatedAt: new Date() });
    const { rows } = await (tx || pool).query(text, values);
    return toCamelRow(rows[0]);
  },

  async findByRider(riderId) {
    const { rows } = await pool.query(
      `SELECT ${RIDE_JOIN_SELECT} ${RIDE_JOIN_FROM} WHERE r."rider_id" = $1 ORDER BY r."created_at" DESC`,
      [riderId]
    );
    return rows.map(hydrateRide);
  },

  async findStatusById(id) {
    const { rows } = await pool.query(
      'SELECT "id", "rider_id" AS "riderId", "status" FROM "rides" WHERE "id" = $1 LIMIT 1',
      [id]
    );
    return toCamelRow(rows[0]) || null;
  },

  async findManyByIds(ids) {
    if (ids.length === 0) return [];
    const { rows } = await pool.query(`SELECT ${RIDE_JOIN_SELECT} ${RIDE_JOIN_FROM} WHERE r."id" = ANY($1)`, [ids]);
    const byId = new Map(rows.map((r) => [r.id, hydrateRide(r)]));
    return ids.map((id) => byId.get(id)).filter(Boolean);
  },

  /**
   * A vehicle can't physically run two rides at once, so this looks for
   * another still-active (not cancelled/completed) ride already booked for
   * the same vehicle at the same departure date + time. `excludeRideId` lets
   * an edit ignore the ride's own row when re-checking after a change.
   */
  async findConflictingByVehicle({ vehicleId, departureDate, departureTime, excludeRideId }) {
    const { rows } = await pool.query(
      `SELECT "id" FROM "rides"
       WHERE "vehicle_id" = $1
         AND "departure_date" = $2::date
         AND "departure_time" = $3
         AND "status" IN ('DRAFT', 'PUBLISHED', 'STARTED')
         AND "id" != $4
       LIMIT 1`,
      [vehicleId, departureDate, departureTime, excludeRideId || ""]
    );
    return toCamelRow(rows[0]) || null;
  },

  /**
   * Radius search using PostGIS ST_DWithin against the geography columns kept in
   * sync by the rides_sync_geog_trigger (see the postgis_geo_columns migration).
   * Returns candidate ride ids with their pickup/destination distances in meters
   * so the matching service can score and rank them.
   */
  async searchCandidates({ sourceLatitude, sourceLongitude, destinationLatitude, destinationLongitude, date, time, seats, rideType, pickupRadiusM, destinationRadiusM, timeWindowMinutes = 30, includeFull = false }) {
    const params = [];
    const p = (v) => {
      params.push(v);
      return `$${params.length}`;
    };

    const sourcePoint = () => `ST_SetSRID(ST_MakePoint(${p(sourceLongitude)}::float8, ${p(sourceLatitude)}::float8), 4326)::geography`;
    const destinationPoint = () => `ST_SetSRID(ST_MakePoint(${p(destinationLongitude)}::float8, ${p(destinationLatitude)}::float8), 4326)::geography`;

    const sourceDistanceExpr = `ST_Distance(r.source_geog, ${sourcePoint()}) AS source_distance_m`;
    const destinationDistanceExpr = `ST_Distance(r.destination_geog, ${destinationPoint()}) AS destination_distance_m`;
    const dateParam = p(date);
    const seatsClause = includeFull ? "" : `AND r.available_seats >= ${p(seats)}`;
    const rideTypeClause = rideType ? `AND r.ride_type = ${p(rideType)}::"RideType"` : "";
    let timeClause = "";
    if (time) {
      const [hours, minutes] = String(time).split(":").map(Number);
      const targetMinutes = hours * 60 + minutes;
      const timeParam = p(targetMinutes);
      const windowParam = p(timeWindowMinutes);
      timeClause = `AND LEAST(ABS(((split_part(r.departure_time, ':', 1)::int * 60) + split_part(r.departure_time, ':', 2)::int) - ${timeParam}), 1440 - ABS(((split_part(r.departure_time, ':', 1)::int * 60) + split_part(r.departure_time, ':', 2)::int) - ${timeParam})) <= ${windowParam}`;
    }

    // We only store a ride's two endpoints, not its actual road geometry, so
    // the straight line between them stands in as an approximation of the
    // route. Matching against the line (not just the two endpoints) lets a
    // pickup/drop-off that's genuinely along the way - e.g. a town the ride
    // passes through - match even though it's nowhere near either endpoint.
    const routeLine = `ST_MakeLine(r.source_geog::geometry, r.destination_geog::geometry)::geography`;

    const sourceDWithin = `ST_DWithin(r.source_geog, ${sourcePoint()}, ${p(pickupRadiusM)})`;
    const destinationDWithin = `ST_DWithin(r.destination_geog, ${destinationPoint()}, ${p(destinationRadiusM)})`;
    const sourceOnRoute = `ST_DWithin(${routeLine}, ${sourcePoint()}, ${p(pickupRadiusM)})`;
    const destinationOnRoute = `ST_DWithin(${routeLine}, ${destinationPoint()}, ${p(destinationRadiusM)})`;

    // Guard against matching a ride "backwards": require the pickup point to
    // fall no later along the route line than the drop-off point (with a
    // little slack for the corridor width itself).
    const sourceFraction = `ST_LineLocatePoint(${routeLine}::geometry, ${sourcePoint()}::geometry)`;
    const destinationFraction = `ST_LineLocatePoint(${routeLine}::geometry, ${destinationPoint()}::geometry)`;
    const directionOk = `${sourceFraction} <= ${destinationFraction} + 0.05`;

    const { rows } = await pool.query(
      `SELECT id, source_distance_m, destination_distance_m
       FROM (
         SELECT
           r.id,
           ${sourceDistanceExpr},
           ${destinationDistanceExpr}
         FROM rides r
         JOIN vehicles v ON v.id = r.vehicle_id
         WHERE r.status = 'PUBLISHED'
           AND v.verification_status = 'VERIFIED'
           AND v.is_active = true
           AND r.departure_date = ${dateParam}::date
           ${seatsClause}
           ${rideTypeClause}
           ${timeClause}
           AND (${sourceDWithin} OR (${sourceOnRoute} AND ${directionOk}))
           AND (${destinationDWithin} OR (${destinationOnRoute} AND ${directionOk}))
       ) candidates
       ORDER BY (source_distance_m + destination_distance_m) ASC
       LIMIT 50`,
      params
    );
    return rows.map((r) => ({
      id: r.id,
      sourceDistanceKm: Number(r.source_distance_m) / 1000,
      destinationDistanceKm: Number(r.destination_distance_m) / 1000,
    }));
  },

  /** Row-level lock (SELECT ... FOR UPDATE) used inside a transaction to serialize seat reservation. */
  async lockForSeatUpdate(tx, rideId) {
    const { rows } = await tx.query(
      'SELECT "id", "status", "available_seats" AS "availableSeats" FROM "rides" WHERE "id" = $1 FOR UPDATE',
      [rideId]
    );
    return rows[0] || null;
  },

  async decrementSeats(tx, rideId, seats) {
    const { rows } = await tx.query(
      'UPDATE "rides" SET "available_seats" = "available_seats" - $1, "updated_at" = now() WHERE "id" = $2 RETURNING *',
      [seats, rideId]
    );
    return toCamelRow(rows[0]);
  },

  async incrementSeats(tx, rideId, seats) {
    const { rows } = await (tx || pool).query(
      'UPDATE "rides" SET "available_seats" = "available_seats" + $1, "updated_at" = now() WHERE "id" = $2 RETURNING *',
      [seats, rideId]
    );
    return toCamelRow(rows[0]);
  },

  async countCompletedByRider(riderId) {
    const { rows } = await pool.query(
      'SELECT COUNT(*) AS "count" FROM "rides" WHERE "rider_id" = $1 AND "status" = \'COMPLETED\'',
      [riderId]
    );
    return Number(rows[0].count);
  },
};
