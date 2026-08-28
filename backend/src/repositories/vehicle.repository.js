import crypto from "node:crypto";
import { pool } from "../config/db.js";
import { toCamelRow, toCamelRows, insertRow, updateRow } from "../utils/sqlRows.js";
import { normalizeRegistrationNumber } from "../utils/vehicle.utils.js";
import { ApiError } from "../utils/ApiError.js";

export const vehicleRepository = {
  async create(ownerId, data) {
    const now = new Date();
    const normalizedData = {
      ...data,
      registrationNumber: normalizeRegistrationNumber(data.registrationNumber),
    };
    const { text, values } = insertRow("vehicles", {
      id: crypto.randomUUID(),
      ...normalizedData,
      ownerId,
      createdAt: now,
      updatedAt: now,
    });

    try {
      const { rows } = await pool.query(text, values);
      return toCamelRow(rows[0]);
    } catch (error) {
      if (error?.code === "23505" && error?.constraint === "vehicles_registration_number_key") {
        throw ApiError.conflict("Vehicle is already registered");
      }
      throw error;
    }
  },

  async findByOwner(ownerId) {
    const { rows } = await pool.query(
      'SELECT * FROM "vehicles" WHERE "owner_id" = $1 AND "is_active" = true ORDER BY "created_at" DESC',
      [ownerId]
    );
    return toCamelRows(rows);
  },

  async findByRegistrationNumber(registrationNumber) {
    const normalizedRegistrationNumber = normalizeRegistrationNumber(registrationNumber);

    if (!normalizedRegistrationNumber) return null;

    const { rows } = await pool.query(
      `SELECT *
       FROM "vehicles"
       WHERE UPPER(REPLACE(REPLACE("registration_number", ' ', ''), '-', '')) = $1
       AND "is_active" = true
       LIMIT 1`,
      [normalizedRegistrationNumber]
    );

    return rows.length ? toCamelRow(rows[0]) : null;
  },

  /**
   * Same lookup as findByRegistrationNumber but ignores is_active, so callers
   * can detect a soft-deleted row before hitting the DB's unique constraint
   * on registration_number (which applies regardless of active status).
   */
  async findAnyByRegistrationNumber(registrationNumber) {
    const normalizedRegistrationNumber = normalizeRegistrationNumber(registrationNumber);

    if (!normalizedRegistrationNumber) return null;

    const { rows } = await pool.query(
      `SELECT *
       FROM "vehicles"
       WHERE UPPER(REPLACE(REPLACE("registration_number", ' ', ''), '-', '')) = $1
       LIMIT 1`,
      [normalizedRegistrationNumber]
    );

    return rows.length ? toCamelRow(rows[0]) : null;
  },

  async findById(id) {
    const { rows } = await pool.query('SELECT * FROM "vehicles" WHERE "id" = $1 LIMIT 1', [id]);
    return toCamelRow(rows[0]);
  },

  async update(id, data) {
    const normalizedData = { ...data };

    if (normalizedData.registrationNumber !== undefined) {
      normalizedData.registrationNumber = normalizeRegistrationNumber(normalizedData.registrationNumber);
    }

    const { text, values } = updateRow("vehicles", id, { ...normalizedData, updatedAt: new Date() });

    try {
      const { rows } = await pool.query(text, values);
      return toCamelRow(rows[0]);
    } catch (error) {
      if (error?.code === "23505" && error?.constraint === "vehicles_registration_number_key") {
        throw ApiError.conflict("Vehicle is already registered");
      }
      throw error;
    }
  },

  async countActiveRides(vehicleId) {
    const { rows } = await pool.query(
      'SELECT COUNT(*) AS "count" FROM "rides" WHERE "vehicle_id" = $1 AND "status" = ANY($2::"RideStatus"[])',
      [vehicleId, ["DRAFT", "PUBLISHED", "STARTED"]]
    );
    return Number(rows[0].count);
  },
};
