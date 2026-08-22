import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import "dotenv/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, "..", "prisma", "migrations");

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS "_sql_migrations" (
        "id" TEXT PRIMARY KEY,
        "applied_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    const { rows: applied } = await client.query('SELECT "id" FROM "_sql_migrations"');
    const appliedIds = new Set(applied.map((r) => r.id));

    const migrationFolders = fs
      .readdirSync(migrationsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();

    for (const folder of migrationFolders) {
      if (appliedIds.has(folder)) {
        console.log(`Skipping already-applied migration: ${folder}`);
        continue;
      }

      const sqlPath = path.join(migrationsDir, folder, "migration.sql");
      const sql = fs.readFileSync(sqlPath, "utf8");

      console.log(`Applying migration: ${folder}`);
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query('INSERT INTO "_sql_migrations" ("id") VALUES ($1)', [folder]);
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw new Error(`Migration ${folder} failed: ${err.message}`);
      }
    }

    console.log("All migrations applied.");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
