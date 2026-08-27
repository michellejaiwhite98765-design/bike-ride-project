import crypto from "node:crypto";
import { pool } from "../config/db.js";
import { logger } from "../config/logger.js";
import { insertRow } from "./sqlRows.js";

export async function audit(client, { userId, action, entityType, entityId, metadata }) {
  try {
    const { text, values } = insertRow("audit_logs", {
      id: crypto.randomUUID(),
      userId: userId ?? null,
      action,
      entityType,
      entityId: entityId ?? null,
      metadata: metadata ?? null,
      createdAt: new Date(),
    });
    await (client || pool).query(text, values);
  } catch (err) {
    logger.warn(`Audit log failed: ${err.message}`);
  }
}
