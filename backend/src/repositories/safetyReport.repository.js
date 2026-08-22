import crypto from "node:crypto";
import { pool } from "../config/db.js";
import { toCamelRow, insertRow, updateRow, nestPrefixed } from "../utils/sqlRows.js";

const JOIN_SELECT = `
  sr.*,
  reporter."id" AS "reporter__id", reporter."first_name" AS "reporter__first_name", reporter."last_name" AS "reporter__last_name",
  reported."id" AS "reportedUser__id", reported."first_name" AS "reportedUser__first_name", reported."last_name" AS "reportedUser__last_name"
`;
const JOIN_FROM = `
  FROM "safety_reports" sr
  JOIN "users" reporter ON reporter."id" = sr."reporter_id"
  JOIN "users" reported ON reported."id" = sr."reported_user_id"
`;

function hydrate(row) {
  return nestPrefixed(row, { reporter: "reporter", reportedUser: "reportedUser" });
}

export const safetyReportRepository = {
  async create(reporterId, data) {
    const now = new Date();
    const { text, values } = insertRow("safety_reports", {
      id: crypto.randomUUID(),
      reporterId,
      ...data,
      createdAt: now,
      updatedAt: now,
    });
    const { rows } = await pool.query(text, values);
    const hydrated = await pool.query(`SELECT ${JOIN_SELECT} ${JOIN_FROM} WHERE sr."id" = $1 LIMIT 1`, [rows[0].id]);
    return hydrate(hydrated.rows[0]);
  },

  async findById(id) {
    const { rows } = await pool.query('SELECT * FROM "safety_reports" WHERE "id" = $1 LIMIT 1', [id]);
    return toCamelRow(rows[0]) || null;
  },

  async findAll() {
    const { rows } = await pool.query(`SELECT ${JOIN_SELECT} ${JOIN_FROM} ORDER BY sr."created_at" DESC`);
    return rows.map(hydrate);
  },

  async update(id, data) {
    const { text, values } = updateRow("safety_reports", id, { ...data, updatedAt: new Date() });
    await pool.query(text, values);
    const hydrated = await pool.query(`SELECT ${JOIN_SELECT} ${JOIN_FROM} WHERE sr."id" = $1 LIMIT 1`, [id]);
    return hydrate(hydrated.rows[0]);
  },
};
