-- A photo of the vehicle (small WEBP data URL, like profile photos), so passengers can spot it.
ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "photo" TEXT;
