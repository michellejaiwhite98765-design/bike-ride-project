// Shared helpers for turning raw `pg` rows into the same camelCase, nested
// shapes the previous Prisma repositories returned (Prisma's @map columns are
// all regular snake_case<->camelCase pairs, so a generic transform suffices).

export function toCamel(key) {
  return key.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
}

export function toCamelRow(row) {
  if (!row) return row;
  const out = {};
  for (const [key, value] of Object.entries(row)) {
    out[toCamel(key)] = value;
  }
  return out;
}

export function toCamelRows(rows) {
  return rows.map(toCamelRow);
}

export function toSnake(key) {
  return key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

const q = (identifier) => `"${identifier}"`;

/** Builds `INSERT INTO "table" (...) VALUES (...) RETURNING *` from a camelCase data object. */
export function insertRow(table, data) {
  const columns = Object.keys(data);
  const values = Object.values(data);
  const columnList = columns.map((c) => q(toSnake(c))).join(", ");
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
  return { text: `INSERT INTO ${q(table)} (${columnList}) VALUES (${placeholders}) RETURNING *`, values };
}

/** Builds `UPDATE "table" SET ... WHERE id = $n RETURNING *` from a camelCase data object. */
export function updateRow(table, id, data) {
  const columns = Object.keys(data);
  const values = Object.values(data);
  const setClause = columns.map((c, i) => `${q(toSnake(c))} = $${i + 1}`).join(", ");
  return { text: `UPDATE ${q(table)} SET ${setClause} WHERE ${q("id")} = $${columns.length + 1} RETURNING *`, values: [...values, id] };
}

/**
 * Splits a flat joined row into a base object plus nested objects, based on
 * `prefixMap` (e.g. { vehicle: "vehicle", rider: "rider" }) matching columns
 * aliased as "<prefix>__<column>" in the SQL (e.g. "vehicle__id",
 * "rider__first_name"). A nested group whose "id" column is null (LEFT JOIN
 * with no match) collapses to null instead of an all-null object.
 */
export function nestPrefixed(row, prefixMap) {
  const base = {};
  const nested = {};
  for (const key of Object.keys(prefixMap)) nested[key] = {};

  for (const [column, value] of Object.entries(row)) {
    let matched = false;
    for (const [nestKey, prefix] of Object.entries(prefixMap)) {
      const marker = `${prefix}__`;
      if (column.startsWith(marker)) {
        nested[nestKey][toCamel(column.slice(marker.length))] = value;
        matched = true;
        break;
      }
    }
    if (!matched) base[toCamel(column)] = value;
  }

  for (const key of Object.keys(prefixMap)) {
    base[key] = nested[key].id == null ? null : nested[key];
  }
  return base;
}
