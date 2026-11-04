-- Driving licence verification: a rider must have a verified licence (and a
-- verified vehicle) before they can create or publish a trip. One row per
-- user; re-submitting replaces it.
CREATE TABLE "driving_licences" (
    "user_id" TEXT PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
    "licence_number" TEXT NOT NULL,
    "holder_name" TEXT,
    "expiry_date" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "ocr_extracted_number" TEXT,
    "failure_reason" TEXT,
    "document_url" TEXT,
    "document_public_id" TEXT,
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- A licence number can only be verified on one account.
CREATE UNIQUE INDEX "driving_licences_verified_number_key"
    ON "driving_licences" ("licence_number") WHERE "status" = 'VERIFIED';
