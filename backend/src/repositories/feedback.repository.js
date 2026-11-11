import crypto from "node:crypto";
import { pool } from "../config/db.js";
import { toCamelRow, insertRow, updateRow, nestPrefixed } from "../utils/sqlRows.js";

const SELECT = `
  f.*, u."id" AS "user__id", u."first_name" AS "user__first_name", u."last_name" AS "user__last_name", u."email" AS "user__email"
  FROM "customer_feedback" f JOIN "users" u ON u."id" = f."user_id"
`;
const hydrate = (row) => nestPrefixed(row, { user: "user" });

export const feedbackRepository = {
  async create(userId, data) {
    const now = new Date();
    const { text, values } = insertRow("customer_feedback", {
      id: crypto.randomUUID(), userId, ...data, status: "OPEN", createdAt: now, updatedAt: now,
    });
    const { rows } = await pool.query(text, values);
    return toCamelRow(rows[0]);
  },

  async findById(id) {
    const { rows } = await pool.query(`SELECT ${SELECT} WHERE f."id" = $1 LIMIT 1`, [id]);
    return rows[0] ? hydrate(rows[0]) : null;
  },

  async findByUser(userId) {
    const { rows } = await pool.query('SELECT * FROM "customer_feedback" WHERE "user_id" = $1 ORDER BY "created_at" DESC', [userId]);
    return rows.map(toCamelRow);
  },

  /** Unresolved first, newest first. */
  async findAll() {
    const { rows } = await pool.query(`SELECT ${SELECT} ORDER BY (f."status" = 'RESOLVED'), f."created_at" DESC`);
    return rows.map(hydrate);
  },

  async update(id, data) {
    const { text, values } = updateRow("customer_feedback", id, { ...data, updatedAt: new Date() });
    await pool.query(text, values);
    return this.findById(id);
  },
};
