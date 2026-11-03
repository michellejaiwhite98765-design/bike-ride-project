import { pool } from "../config/db.js";

export const phoneOtpRepository = {
  async find(phone) {
    const { rows } = await pool.query(
      `SELECT "phone", "otp_hash" AS "otpHash", "sent_at" AS "sentAt", "expires_at" AS "expiresAt", "attempts",
              "verified_at" AS "verifiedAt", "verification_token_hash" AS "verificationTokenHash",
              "verification_expires_at" AS "verificationExpiresAt"
         FROM "phone_otps" WHERE "phone" = $1`,
      [phone]
    );
    return rows[0] || null;
  },

  /** A new code replaces any earlier one (and any earlier verification) for this phone. */
  async saveCode(phone, otpHash, expiresAt) {
    await pool.query(
      `INSERT INTO "phone_otps" ("phone", "otp_hash", "sent_at", "expires_at", "attempts")
       VALUES ($1, $2, now(), $3, 0)
       ON CONFLICT ("phone") DO UPDATE SET
         "otp_hash" = EXCLUDED."otp_hash", "sent_at" = now(), "expires_at" = EXCLUDED."expires_at", "attempts" = 0,
         "verified_at" = NULL, "verification_token_hash" = NULL, "verification_expires_at" = NULL`,
      [phone, otpHash, expiresAt]
    );
  },

  async remove(phone) {
    await pool.query('DELETE FROM "phone_otps" WHERE "phone" = $1', [phone]);
  },

  async bumpAttempts(phone) {
    const { rows } = await pool.query(
      'UPDATE "phone_otps" SET "attempts" = "attempts" + 1 WHERE "phone" = $1 RETURNING "attempts"',
      [phone]
    );
    return rows[0]?.attempts ?? 0;
  },

  async markVerified(phone, tokenHash, tokenExpiresAt) {
    await pool.query(
      `UPDATE "phone_otps" SET "verified_at" = now(), "verification_token_hash" = $2, "verification_expires_at" = $3
        WHERE "phone" = $1`,
      [phone, tokenHash, tokenExpiresAt]
    );
  },

  /** Uses up a verification (atomically), so one verified code creates at most one account. */
  async consumeVerification(phone, tokenHash, client = pool) {
    const { rowCount } = await client.query(
      `DELETE FROM "phone_otps"
        WHERE "phone" = $1 AND "verification_token_hash" = $2 AND "verification_expires_at" > now()`,
      [phone, tokenHash]
    );
    return rowCount === 1;
  },
};
