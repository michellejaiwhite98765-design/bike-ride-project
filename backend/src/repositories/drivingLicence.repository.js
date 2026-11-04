import { pool } from "../config/db.js";
import { toCamelRow } from "../utils/sqlRows.js";

export const drivingLicenceRepository = {
  async findByUser(userId) {
    const { rows } = await pool.query('SELECT * FROM "driving_licences" WHERE "user_id" = $1', [userId]);
    return toCamelRow(rows[0]);
  },

  /** Another account's VERIFIED licence with this number, if any. */
  async findVerifiedByNumber(licenceNumber, exceptUserId) {
    const { rows } = await pool.query(
      `SELECT * FROM "driving_licences" WHERE "licence_number" = $1 AND "status" = 'VERIFIED' AND "user_id" <> $2 LIMIT 1`,
      [licenceNumber, exceptUserId]
    );
    return toCamelRow(rows[0]);
  },

  async upsert(userId, data) {
    const { rows } = await pool.query(
      `INSERT INTO "driving_licences"
         ("user_id", "licence_number", "holder_name", "expiry_date", "status", "ocr_extracted_number",
          "failure_reason", "document_url", "document_public_id", "verified_at", "updated_at")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())
       ON CONFLICT ("user_id") DO UPDATE SET
         "licence_number" = EXCLUDED."licence_number", "holder_name" = EXCLUDED."holder_name",
         "expiry_date" = EXCLUDED."expiry_date", "status" = EXCLUDED."status",
         "ocr_extracted_number" = EXCLUDED."ocr_extracted_number", "failure_reason" = EXCLUDED."failure_reason",
         "document_url" = EXCLUDED."document_url", "document_public_id" = EXCLUDED."document_public_id",
         "verified_at" = EXCLUDED."verified_at", "updated_at" = now()
       RETURNING *`,
      [
        userId,
        data.licenceNumber,
        data.holderName ?? null,
        data.expiryDate,
        data.status,
        data.ocrExtractedNumber ?? null,
        data.failureReason ?? null,
        data.documentUrl ?? null,
        data.documentPublicId ?? null,
        data.verifiedAt ?? null,
      ]
    );
    return toCamelRow(rows[0]);
  },
};
