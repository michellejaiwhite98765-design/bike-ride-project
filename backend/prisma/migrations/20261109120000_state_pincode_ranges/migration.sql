-- Standalone lookup: which state a PIN code belongs to, by its first 3 digits.
-- Not linked to any other table yet.
--
-- Lookup:  SELECT state FROM state_pincode_ranges
--          WHERE LEFT('629002', 3)::int BETWEEN prefix_from AND prefix_to;
--
-- Based on India Post's PIN zone/circle allocation. A few 3-digit prefixes are
-- shared by two states/UTs (e.g. 605 Tamil Nadu + Puducherry, 160 Punjab +
-- Chandigarh), so a lookup can return more than one row for those.
CREATE TABLE IF NOT EXISTS "state_pincode_ranges" (
  "id"          SERIAL PRIMARY KEY,
  "state"       TEXT     NOT NULL,
  "prefix_from" SMALLINT NOT NULL CHECK ("prefix_from" BETWEEN 110 AND 999),
  "prefix_to"   SMALLINT NOT NULL CHECK ("prefix_to" BETWEEN 110 AND 999),
  CHECK ("prefix_from" <= "prefix_to")
);

CREATE INDEX IF NOT EXISTS "state_pincode_ranges_prefix_idx"
  ON "state_pincode_ranges" ("prefix_from", "prefix_to");

INSERT INTO "state_pincode_ranges" ("state", "prefix_from", "prefix_to") VALUES
  -- Northern
  ('Delhi',                                    110, 110),
  ('Haryana',                                  121, 136),
  ('Punjab',                                   140, 160),
  ('Chandigarh',                               160, 160),
  ('Himachal Pradesh',                         171, 177),
  ('Jammu and Kashmir',                        180, 193),
  ('Ladakh',                                   194, 194),
  ('Uttar Pradesh',                            201, 245),
  ('Uttar Pradesh',                            247, 247),
  ('Uttar Pradesh',                            250, 261),
  ('Uttar Pradesh',                            270, 285),
  ('Uttarakhand',                              244, 244),
  ('Uttarakhand',                              246, 249),
  ('Uttarakhand',                              262, 263),
  -- Western
  ('Rajasthan',                                301, 345),
  ('Gujarat',                                  360, 396),
  ('Dadra and Nagar Haveli and Daman and Diu', 362, 362),
  ('Dadra and Nagar Haveli and Daman and Diu', 396, 396),
  ('Maharashtra',                              400, 402),
  ('Goa',                                      403, 403),
  ('Maharashtra',                              404, 445),
  ('Madhya Pradesh',                           450, 488),
  ('Chhattisgarh',                             490, 497),
  -- Southern
  ('Telangana',                                500, 509),
  ('Andhra Pradesh',                           515, 535),
  ('Puducherry',                               533, 533),
  ('Karnataka',                                560, 591),
  ('Tamil Nadu',                               600, 643),
  ('Puducherry',                               605, 605),
  ('Puducherry',                               609, 609),
  ('Kerala',                                   670, 695),
  ('Puducherry',                               673, 673),
  ('Lakshadweep',                              682, 682),
  -- Eastern
  ('West Bengal',                              700, 743),
  ('Sikkim',                                   737, 737),
  ('Andaman and Nicobar Islands',              744, 744),
  ('Odisha',                                   751, 770),
  ('Bihar',                                    800, 812),
  ('Jharkhand',                                813, 816),
  ('Bihar',                                    817, 821),
  ('Jharkhand',                                822, 822),
  ('Bihar',                                    823, 824),
  ('Jharkhand',                                825, 835),
  ('Bihar',                                    841, 855),
  -- North-East
  ('Assam',                                    781, 788),
  ('Arunachal Pradesh',                        790, 792),
  ('Meghalaya',                                793, 794),
  ('Manipur',                                  795, 795),
  ('Mizoram',                                  796, 796),
  ('Nagaland',                                 797, 798),
  ('Tripura',                                  799, 799);
