-- Every India Post office with its PIN code, district and state.
-- Source: India Post "All India Pincode Directory" (data.gov.in).
-- A PIN code usually covers several post offices, so it repeats.
-- Rows are loaded by `npm run seed:pincodes`. Not linked to any other table yet.
CREATE TABLE IF NOT EXISTS "pincodes" (
  "id"          SERIAL PRIMARY KEY,
  "pincode"     CHAR(6)       NOT NULL,
  "office_name" TEXT          NOT NULL,
  "office_type" TEXT,                    -- HO / PO (sub office) / BO (branch office)
  "delivery"    BOOLEAN,                 -- delivers mail?
  "district"    TEXT          NOT NULL,
  "state"       TEXT          NOT NULL,
  "latitude"    NUMERIC(9, 6),
  "longitude"   NUMERIC(9, 6)
);

CREATE INDEX IF NOT EXISTS "pincodes_pincode_idx" ON "pincodes" ("pincode");
CREATE INDEX IF NOT EXISTS "pincodes_state_idx" ON "pincodes" ("state");
