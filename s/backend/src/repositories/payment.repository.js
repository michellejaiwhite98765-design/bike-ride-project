import crypto from "node:crypto";
import { pool } from "../config/db.js";
import { toCamelRow, insertRow, updateRow } from "../utils/sqlRows.js";

export const paymentRepository = {
  async create(tx, data) {
    const now = new Date();
    const { text, values } = insertRow("payments", { id: crypto.randomUUID(), ...data, createdAt: now, updatedAt: now });
    const { rows } = await (tx || pool).query(text, values);
    return toCamelRow(rows[0]);
  },
  async findByIdempotencyKey(idempotencyKey, tx) {
    const { rows } = await (tx || pool).query('SELECT * FROM "payments" WHERE "idempotency_key" = $1 LIMIT 1', [idempotencyKey]);
    return toCamelRow(rows[0]) || null;
  },
  async findByProviderOrderId(providerOrderId, tx) {
    const { rows } = await (tx || pool).query('SELECT * FROM "payments" WHERE "provider_order_id" = $1 LIMIT 1', [providerOrderId]);
    return toCamelRow(rows[0]) || null;
  },
  async update(id, data, tx) {
    const { text, values } = updateRow("payments", id, { ...data, updatedAt: new Date() });
    const { rows } = await (tx || pool).query(text, values);
    return toCamelRow(rows[0]);
  },
};
