import crypto from "node:crypto";
import { pool } from "../config/db.js";
import { toCamelRow, insertRow, updateRow, nestPrefixed } from "../utils/sqlRows.js";

const RIDE_JOIN_SELECT = `
  r."id", r."rider_id", r."vehicle_id", r."source_name", r."source_latitude", r."source_longitude",
  r."destination_name", r."destination_latitude", r."destination_longitude", r."pickup_preference", r."departure_date", r."departure_time",
  r."available_seats", r."total_seats", r."ride_type", r."tip_amount", r."notes", r."status",
  r."started_at", r."completed_at", r."cancelled_at", r."created_at", r."updated_at",
  ROUND((ST_Length(r."route_geog") / 1000)::numeric, 1)::float8 AS "route_distance_km",
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

// The ride's real road route when we have it, otherwise the straight line
// between its start and destination. Expects the rides table aliased as `r`.
const ROUTE_GEOG = `COALESCE(r.route_geog, ST_MakeLine(r.source_geog::geometry, r.destination_geog::geometry)::geography)`;

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
    if (data.routePath) await this.setRoutePath(rows[0].id, data.routePath);
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
   * Stores the road route the rider picked (array of [lat, lng]). Passing
   * null clears it, e.g. when the start/end changed and the old route no
   * longer applies - distance checks then fall back to the straight line.
   */
  async setRoutePath(rideId, routePath, tx) {
    const wkt = routePath && routePath.length >= 2
      ? `LINESTRING(${routePath.map(([lat, lng]) => `${Number(lng)} ${Number(lat)}`).join(", ")})`
      : null;
    await (tx || pool).query(
      `UPDATE "rides" SET "route_geog" = CASE WHEN $1::text IS NULL THEN NULL ELSE ST_GeogFromText('SRID=4326;' || $1::text) END WHERE "id" = $2`,
      [wkt, rideId]
    );
  },

  /** Copies a saved road route from one of the rider's rides to another with the same endpoints. */
  async copyRouteFrom(fromRideId, toRideId, riderId) {
    const { rowCount } = await pool.query(
      `UPDATE "rides" t SET "route_geog" = f."route_geog"
       FROM "rides" f
       WHERE t."id" = $2 AND f."id" = $1 AND f."rider_id" = $3 AND t."rider_id" = $3
         AND f."route_geog" IS NOT NULL
         AND f."source_latitude" = t."source_latitude" AND f."source_longitude" = t."source_longitude"
         AND f."destination_latitude" = t."destination_latitude" AND f."destination_longitude" = t."destination_longitude"`,
      [fromRideId, toRideId, riderId]
    );
    return rowCount > 0;
  },

  /**
   * How far a pickup (and optionally a drop) point is from the ride's route,
   * plus where along the route each falls (0 = start, 1 = end) so callers
   * can tell whether the passenger is going the same way.
   */
  async joinGeometry(rideId, pickup, drop) {
    const { rows } = await pool.query(
      `WITH ride AS (
         SELECT ${ROUTE_GEOG} AS route, r.route_geog IS NOT NULL AS has_route
         FROM "rides" r WHERE r."id" = $1
       ),
       pts AS (
         SELECT ST_SetSRID(ST_MakePoint($2::float8, $3::float8), 4326)::geography AS pickup,
                CASE WHEN $4::float8 IS NULL THEN NULL
                     ELSE ST_SetSRID(ST_MakePoint($4::float8, $5::float8), 4326)::geography END AS drop
       )
       SELECT
         ride.has_route,
         ST_Distance(ride.route, pts.pickup) AS pickup_m,
         ST_LineLocatePoint(ride.route::geometry, pts.pickup::geometry) AS pickup_frac,
         CASE WHEN pts.drop IS NULL THEN NULL ELSE ST_Distance(ride.route, pts.drop) END AS drop_m,
         CASE WHEN pts.drop IS NULL THEN NULL ELSE ST_LineLocatePoint(ride.route::geometry, pts.drop::geometry) END AS drop_frac
       FROM ride, pts`,
      [rideId, pickup.longitude, pickup.latitude, drop?.longitude ?? null, drop?.latitude ?? null]
    );
    const row = rows[0];
    if (!row) return null;
    const num = (v) => (v == null ? null : Number(v));
    return {
      hasRoute: row.has_route,
      pickupM: num(row.pickup_m),
      pickupFraction: num(row.pickup_frac),
      dropM: num(row.drop_m),
      dropFraction: num(row.drop_frac),
    };
  },

  /**
   * Closes rides that were never started and whose departure time passed
   * more than `graceMinutes` ago (departure date/time are local time, see
   * utils/departure.js). Returns the ids of the rides it expired.
   */
  async expireStale(graceMinutes, tzOffsetMinutes, tx) {
    const { rows } = await (tx || pool).query(
      `UPDATE "rides"
       SET "status" = 'EXPIRED', "updated_at" = now()
       WHERE "status" IN ('DRAFT', 'PUBLISHED')
         AND ("departure_date" + "departure_time"::time) - make_interval(mins => $2::int) + make_interval(mins => $1::int)
             < (now() AT TIME ZONE 'UTC')
       RETURNING "id", "destination_name" AS "destinationName"`,
      [graceMinutes, tzOffsetMinutes]
    );
    return rows;
  },

  /**
   * A rider may only have one open trip at a time: any ride of theirs that is
   * still a draft, published or started (i.e. not yet completed, cancelled
   * or expired) counts as open.
   */
  async findOpenByRider(riderId) {
    const { rows } = await pool.query(
      `SELECT "id", "status", "source_name" AS "sourceName", "destination_name" AS "destinationName"
       FROM "rides"
       WHERE "rider_id" = $1 AND "status" IN ('DRAFT', 'PUBLISHED', 'STARTED')
       ORDER BY "created_at" DESC
       LIMIT 1`,
      [riderId]
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

    // Match against the ride's road route (or, for rides without one, the
    // straight line between its endpoints), not just the two endpoints, so a
    // pickup/drop-off that's genuinely along the way - e.g. a town the ride
    // passes through - matches even though it's nowhere near either endpoint.
    const routeLine = ROUTE_GEOG;

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
