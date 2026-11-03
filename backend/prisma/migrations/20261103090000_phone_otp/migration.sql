-- Sign-up phone verification: a one-time code is sent to the phone and must
-- be confirmed before an account can be created with that number. One row per
-- phone (the latest code); only hashes of the code and of the verification
-- token are stored.
CREATE TABLE "phone_otps" (
    "phone" TEXT PRIMARY KEY,
    "otp_hash" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "verified_at" TIMESTAMP(3),
    "verification_token_hash" TEXT,
    "verification_expires_at" TIMESTAMP(3)
);

ALTER TABLE "users" ADD COLUMN "phone_verified_at" TIMESTAMP(3);
