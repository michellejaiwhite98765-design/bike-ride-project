import { pool } from "../config/db.js";
import { toCamelRow, toCamelRows, nestPrefixed } from "../utils/sqlRows.js";

export const adminRepository = {
  async findUsers() {
    const { rows } = await pool.query('SELECT * FROM "users" ORDER BY "created_at" DESC');
    return toCamelRows(rows);
  },

  async findRides() {
    const { rows } = await pool.query(`
      SELECT
        r.*,
        u."id" AS "rider__id", u."first_name" AS "rider__first_name", u."last_name" AS "rider__last_name",
        v."id" AS "vehicle__id", v."owner_id" AS "vehicle__owner_id", v."vehicle_type" AS "vehicle__vehicle_type",
        v."brand" AS "vehicle__brand", v."model" AS "vehicle__model",
        v."registration_number" AS "vehicle__registration_number", v."color" AS "vehicle__color",
        v."manufacturing_year" AS "vehicle__manufacturing_year", v."verification_status" AS "vehicle__verification_status",
        v."is_active" AS "vehicle__is_active", v."created_at" AS "vehicle__created_at", v."updated_at" AS "vehicle__updated_at"
      FROM "rides" r
      JOIN "users" u ON u."id" = r."rider_id"
      JOIN "vehicles" v ON v."id" = r."vehicle_id"
      ORDER BY r."created_at" DESC
    `);
    return rows.map((row) => nestPrefixed(row, { rider: "rider", vehicle: "vehicle" }));
  },

  async findBookings() {
    const { rows } = await pool.query(`
      SELECT
        b.*,
        r."id" AS "ride__id", r."source_name" AS "ride__source_name",
        r."destination_name" AS "ride__destination_name", r."departure_date" AS "ride__departure_date",
        p."id" AS "passenger__id", p."first_name" AS "passenger__first_name", p."last_name" AS "passenger__last_name"
      FROM "bookings" b
      JOIN "rides" r ON r."id" = b."ride_id"
      JOIN "users" p ON p."id" = b."passenger_id"
      ORDER BY b."created_at" DESC
    `);
    return rows.map((row) => nestPrefixed(row, { ride: "ride", passenger: "passenger" }));
  },

  async findPayments() {
    const { rows } = await pool.query('SELECT * FROM "payments" ORDER BY "created_at" DESC');
    return toCamelRows(rows);
  },

  async updateUserStatus(id, isActive) {
    const { rows } = await pool.query(
      'UPDATE "users" SET "is_active" = $1, "updated_at" = now() WHERE "id" = $2 RETURNING *',
      [isActive, id]
    );
    return toCamelRow(rows[0]);
  },

  async verifyVehicle(id, verificationStatus) {
    const { rows } = await pool.query(
      'UPDATE "vehicles" SET "verification_status" = $1, "updated_at" = now() WHERE "id" = $2 RETURNING *',
      [verificationStatus, id]
    );
    return toCamelRow(rows[0]);
  },
};
