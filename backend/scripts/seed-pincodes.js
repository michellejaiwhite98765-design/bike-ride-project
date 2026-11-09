// Loads every India Post office (PIN code, office, district, state) into "pincodes".
// Data: prisma/data/pincodes.csv.gz (from India Post's All India Pincode Directory).
// Safe to re-run: it replaces the table contents in one transaction.
//
//   npm run migrate && npm run seed:pincodes
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import pg from "pg";
import "dotenv/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataFile = path.join(__dirname, "..", "prisma", "data", "pincodes.csv.gz");
const BATCH = 2000;

function parseLine(line) {
  const out = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') quoted = false;
      else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

async function main() {
  const lines = zlib.gunzipSync(fs.readFileSync(dataFile)).toString("utf8").split("\n").slice(1).filter(Boolean);
  const rows = lines.map((l) => {
    const [pincode, office, type, delivery, district, state, lat, lng] = parseLine(l);
    return [pincode, office, type || null, delivery === "true", district, state, lat || null, lng || null];
  });

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query('TRUNCATE "pincodes" RESTART IDENTITY');
    for (let i = 0; i < rows.length; i += BATCH) {
      const chunk = rows.slice(i, i + BATCH);
      const params = [];
      const values = chunk.map((r, j) => {
        params.push(...r);
        const b = j * 8;
        return `($${b + 1},$${b + 2},$${b + 3},$${b + 4},$${b + 5},$${b + 6},$${b + 7},$${b + 8})`;
      });
      await client.query(
        `INSERT INTO "pincodes" ("pincode","office_name","office_type","delivery","district","state","latitude","longitude") VALUES ${values.join(",")}`,
        params
      );
    }
    await client.query("COMMIT");
    console.log(`Loaded ${rows.length} post offices into "pincodes".`);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
