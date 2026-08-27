ALTER TABLE "vehicles"
  ADD COLUMN IF NOT EXISTS "rc_document_url" TEXT,
  ADD COLUMN IF NOT EXISTS "rc_document_public_id" TEXT,
  ADD COLUMN IF NOT EXISTS "verification_provider" TEXT,
  ADD COLUMN IF NOT EXISTS "verification_order_id" TEXT,
  ADD COLUMN IF NOT EXISTS "verification_data" JSONB,
  ADD COLUMN IF NOT EXISTS "verification_checked_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "verification_failure_reason" TEXT,
  ADD COLUMN IF NOT EXISTS "verified_at" TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS "vehicles_registration_number_idx"
  ON "vehicles" ("registration_number");

CREATE INDEX IF NOT EXISTS "vehicles_verification_status_idx"
  ON "vehicles" ("verification_status");
