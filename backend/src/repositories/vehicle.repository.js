import crypto from "node:crypto";
import { pool } from "../config/db.js";
import { toCamelRow, toCamelRows, insertRow, updateRow } from "../utils/sqlRows.js";

export const vehicleRepository = {
  async create(ownerId, data) {
    const now = new Date();
    const { text, values } = insertRow("vehicles", {
      id: crypto.randomUUID(),
      ...data,
      ownerId,
      createdAt: now,
      updatedAt: now,
    });
    const { rows } = await pool.query(text, values);
    return toCamelRow(rows[0]);
  },
  async findByOwner(ownerId) {
    const { rows } = await pool.query(
      'SELECT * FROM "vehicles" WHERE "owner_id" = $1 ORDER BY "created_at" DESC',
      [ownerId]
    );
    return toCamelRows(rows);
  },
  async findById(id) {
    const { rows } = await pool.query('SELECT * FROM "vehicles" WHERE "id" = $1 LIMIT 1', [id]);
    return toCamelRow(rows[0]);
  },
  async update(id, data) {
    const { text, values } = updateRow("vehicles", id, { ...data, updatedAt: new Date() });
    const { rows } = await pool.query(text, values);
    return toCamelRow(rows[0]);
  },
  async countActiveRides(vehicleId) {
    const { rows } = await pool.query(
      'SELECT COUNT(*) AS "count" FROM "rides" WHERE "vehicle_id" = $1 AND "status" = ANY($2::"RideStatus"[])',
      [vehicleId, ["DRAFT", "PUBLISHED", "STARTED"]]
    );
    return Number(rows[0].count);
  },
};
