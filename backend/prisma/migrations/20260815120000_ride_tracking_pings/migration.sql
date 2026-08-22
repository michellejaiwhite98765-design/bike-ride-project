-- Persists downsampled GPS breadcrumbs for a ride while it is STARTED, used for
-- trip replay, receipts and dispute evidence. Live position while connected is
-- kept in-memory on the socket server and broadcast directly; this table only
-- gets a snapshot every TRACKING_SNAPSHOT_INTERVAL_MS (see src/realtime/socket.js).

CREATE TABLE "ride_tracking_pings" (
  "id" TEXT NOT NULL,
  "ride_id" TEXT NOT NULL,
  "latitude" DECIMAL(9,6) NOT NULL,
  "longitude" DECIMAL(9,6) NOT NULL,
  "heading_deg" DOUBLE PRECISION,
  "speed_kph" DOUBLE PRECISION,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ride_tracking_pings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ride_tracking_pings_ride_id_idx" ON "ride_tracking_pings"("ride_id");
