import crypto from "node:crypto";
import { pool } from "../config/db.js";
import { toCamelRow, insertRow, nestPrefixed } from "../utils/sqlRows.js";

const REVIEWER_COLUMNS = `
  u."id" AS "reviewer__id", u."first_name" AS "reviewer__first_name", u."last_name" AS "reviewer__last_name",
  u."profile_image" AS "reviewer__profile_image"
`;

async function findByIdWithReviewer(id) {
  const { rows } = await pool.query(
    `SELECT r.*, ${REVIEWER_COLUMNS} FROM "ratings" r JOIN "users" u ON u."id" = r."reviewer_id" WHERE r."id" = $1 LIMIT 1`,
    [id]
  );
  return rows[0] ? nestPrefixed(rows[0], { reviewer: "reviewer" }) : null;
}

export const ratingRepository = {
  async create(data) {
    const { text, values } = insertRow("ratings", { id: crypto.randomUUID(), ...data, createdAt: new Date() });
    const { rows } = await pool.query(text, values);
    return findByIdWithReviewer(rows[0].id);
  },

  async findExisting(bookingId, reviewerId, revieweeId) {
    const { rows } = await pool.query(
      'SELECT * FROM "ratings" WHERE "booking_id" = $1 AND "reviewer_id" = $2 AND "reviewee_id" = $3 LIMIT 1',
      [bookingId, reviewerId, revieweeId]
    );
    return toCamelRow(rows[0]) || null;
  },

  async findByReviewee(userId) {
    const { rows } = await pool.query(
      `SELECT r.*, ${REVIEWER_COLUMNS} FROM "ratings" r JOIN "users" u ON u."id" = r."reviewer_id"
       WHERE r."reviewee_id" = $1 ORDER BY r."created_at" DESC`,
      [userId]
    );
    return rows.map((row) => nestPrefixed(row, { reviewer: "reviewer" }));
  },

  /** Replaces prisma.rating.aggregate(...) used by user.service.js#getPublicProfile. */
  async aggregateForReviewee(userId) {
    const { rows } = await pool.query(
      'SELECT AVG("score") AS "avg_score", COUNT("score") AS "count_score" FROM "ratings" WHERE "reviewee_id" = $1',
      [userId]
    );
    const row = rows[0];
    return {
      avgScore: row.avg_score == null ? null : Number(row.avg_score),
      countScore: Number(row.count_score),
    };
  },

  /** Replaces prisma.rating.groupBy(...) used by ride.service.js#search. */
  async avgScoresByRevieweeIds(revieweeIds) {
    if (revieweeIds.length === 0) return [];
    const { rows } = await pool.query(
      'SELECT "reviewee_id" AS "revieweeId", AVG("score") AS "avgScore" FROM "ratings" WHERE "reviewee_id" = ANY($1) GROUP BY "reviewee_id"',
      [revieweeIds]
    );
    return rows.map((row) => ({ revieweeId: row.revieweeId, avgScore: Number(row.avgScore) }));
  },
};
