-- Add PostGIS geography columns for efficient radius search (ST_DWithin) on rides.
-- Kept outside the Prisma-typed model layer; synced from the existing lat/lng
-- Decimal columns via triggers so callers can keep writing plain lat/lng through
-- Prisma while search/matching queries use raw SQL against these columns.

ALTER TABLE "rides"
  ADD COLUMN "source_geog" geography(Point, 4326),
  ADD COLUMN "destination_geog" geography(Point, 4326);

CREATE OR REPLACE FUNCTION rides_sync_geog() RETURNS trigger AS $$
BEGIN
  NEW.source_geog := ST_SetSRID(ST_MakePoint(NEW.source_longitude::float8, NEW.source_latitude::float8), 4326)::geography;
  NEW.destination_geog := ST_SetSRID(ST_MakePoint(NEW.destination_longitude::float8, NEW.destination_latitude::float8), 4326)::geography;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER rides_sync_geog_trigger
  BEFORE INSERT OR UPDATE OF source_latitude, source_longitude, destination_latitude, destination_longitude
  ON "rides"
  FOR EACH ROW
  EXECUTE FUNCTION rides_sync_geog();

CREATE INDEX rides_source_geog_idx ON "rides" USING GIST ("source_geog");
CREATE INDEX rides_destination_geog_idx ON "rides" USING GIST ("destination_geog");

-- Same treatment for ride_requests pickup/drop, used when scoring candidate matches.
ALTER TABLE "ride_requests"
  ADD COLUMN "pickup_geog" geography(Point, 4326),
  ADD COLUMN "drop_geog" geography(Point, 4326);

CREATE OR REPLACE FUNCTION ride_requests_sync_geog() RETURNS trigger AS $$
BEGIN
  NEW.pickup_geog := ST_SetSRID(ST_MakePoint(NEW.pickup_longitude::float8, NEW.pickup_latitude::float8), 4326)::geography;
  NEW.drop_geog := ST_SetSRID(ST_MakePoint(NEW.drop_longitude::float8, NEW.drop_latitude::float8), 4326)::geography;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ride_requests_sync_geog_trigger
  BEFORE INSERT OR UPDATE OF pickup_latitude, pickup_longitude, drop_latitude, drop_longitude
  ON "ride_requests"
  FOR EACH ROW
  EXECUTE FUNCTION ride_requests_sync_geog();

CREATE INDEX ride_requests_pickup_geog_idx ON "ride_requests" USING GIST ("pickup_geog");
