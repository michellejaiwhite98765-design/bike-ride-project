import crypto from "node:crypto";
import { pool } from "../config/db.js";
import { toCamelRow, insertRow, updateRow } from "../utils/sqlRows.js";

export const userRepository = {
  async findByEmail(email) {
    const { rows } = await pool.query('SELECT * FROM "users" WHERE "email" = $1 LIMIT 1', [email]);
    return toCamelRow(rows[0]);
  },
  async findByPhone(phone) {
    const { rows } = await pool.query('SELECT * FROM "users" WHERE "phone" = $1 LIMIT 1', [phone]);
    return toCamelRow(rows[0]);
  },
  async findById(id) {
    const { rows } = await pool.query('SELECT * FROM "users" WHERE "id" = $1 LIMIT 1', [id]);
    return toCamelRow(rows[0]);
  },
  async create(data) {
    const now = new Date();
    const { text, values } = insertRow("users", { id: crypto.randomUUID(), ...data, createdAt: now, updatedAt: now });
    const { rows } = await pool.query(text, values);
    return toCamelRow(rows[0]);
  },
  async update(id, data) {
    const { text, values } = updateRow("users", id, { ...data, updatedAt: new Date() });
    const { rows } = await pool.query(text, values);
    return toCamelRow(rows[0]);
  },
  async findByResetToken(hashedToken) {
    const { rows } = await pool.query(
      'SELECT * FROM "users" WHERE "reset_token" = $1 AND "reset_token_expiry" > now() LIMIT 1',
      [hashedToken]
    );
    return toCamelRow(rows[0]);
  },
};
