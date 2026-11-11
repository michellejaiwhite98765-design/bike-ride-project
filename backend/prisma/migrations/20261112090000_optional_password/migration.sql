-- Sign-in is by mobile OTP; new accounts have no password.
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;
