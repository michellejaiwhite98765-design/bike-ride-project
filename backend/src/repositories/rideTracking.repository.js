import crypto from "node:crypto";
import { pool } from "../config/db.js";
import { toCamelRow, toCamelRows, insertRow } from "../utils/sqlRows.js";

export const rideTrackingRepository = {
  async createPing(rideId, { latitude, longitude, headingDeg, speedKph }) {
    const { text, values } = insertRow("ride_tracking_pings", {
      id: crypto.randomUUID(),
      rideId,
      latitude,
      longitude,
      headingDeg,
      speedKph,
      createdAt: new Date(),
    });
    const { rows } = await pool.query(text, values);
    return toCamelRow(rows[0]);
  },

  async listByRide(rideId) {
    const { rows } = await pool.query(
      'SELECT * FROM "ride_tracking_pings" WHERE "ride_id" = $1 ORDER BY "created_at" ASC',
      [rideId]
    );
    return toCamelRows(rows);
  },

  async latestByRide(rideId) {
    const { rows } = await pool.query(
      'SELECT * FROM "ride_tracking_pings" WHERE "ride_id" = $1 ORDER BY "created_at" DESC LIMIT 1',
      [rideId]
    );
    return toCamelRow(rows[0]) || null;
  },
};
