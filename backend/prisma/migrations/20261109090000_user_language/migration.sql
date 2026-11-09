-- The app language the user picked at sign-up or in the profile menu
-- (ISO code, e.g. "en", "ta", "hi"). English by default.
ALTER TABLE "users" ADD COLUMN "language" TEXT NOT NULL DEFAULT 'en';
