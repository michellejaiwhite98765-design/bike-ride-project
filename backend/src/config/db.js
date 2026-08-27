import pg from "pg";
import { env } from "./env.js";
import { logger } from "./logger.js";

// Postgres sends `timestamp`/`date` values as plain strings with no timezone
// info. node-postgres's default parsers interpret them in the process's local
// timezone; force UTC interpretation instead so Date objects (and their
// .toISOString() output in JSON responses) are identical to what the previous
// Prisma-based client produced.
pg.types.setTypeParser(1114, (value) => new Date(`${value}Z`)); // timestamp without time zone
pg.types.setTypeParser(1082, (value) => new Date(`${value}T00:00:00.000Z`)); // date

export const pool = new pg.Pool({ connectionString: env.databaseUrl });

pool.on("error", (err) => logger.error(err.message));

/**
 * Drop-in replacement for prisma.$transaction(async (tx) => {...}). The
 * checked-out client exposes the same .query(text, params) signature as the
 * pool, so repository methods that accept an optional tx keep working with
 * `(tx || pool).query(...)`.
 */
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
