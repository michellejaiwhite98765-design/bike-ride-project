import crypto from "node:crypto";
import { pool } from "../config/db.js";
import { toCamelRow, toCamelRows, insertRow } from "../utils/sqlRows.js";

export const notificationRepository = {
  async create(data) {
    const { text, values } = insertRow("notifications", { id: crypto.randomUUID(), ...data, createdAt: new Date() });
    const { rows } = await pool.query(text, values);
    return toCamelRow(rows[0]);
  },

  async createMany(dataList) {
    const now = new Date();
    for (const data of dataList) {
      const { text, values } = insertRow("notifications", { id: crypto.randomUUID(), ...data, createdAt: now });
      await pool.query(text, values);
    }
  },

  async findByUser(userId) {
    const { rows } = await pool.query(
      'SELECT * FROM "notifications" WHERE "user_id" = $1 ORDER BY "created_at" DESC',
      [userId]
    );
    return toCamelRows(rows);
  },

  async markRead(id, userId) {
    await pool.query('UPDATE "notifications" SET "is_read" = true WHERE "id" = $1 AND "user_id" = $2', [id, userId]);
  },

  async markAllRead(userId) {
    await pool.query('UPDATE "notifications" SET "is_read" = true WHERE "user_id" = $1 AND "is_read" = false', [userId]);
  },
};
