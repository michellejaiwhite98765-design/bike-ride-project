-- Customer feedback about the app/service, answered by admins.
CREATE TABLE IF NOT EXISTS "customer_feedback" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "rating" INTEGER,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "admin_reply" TEXT,
    "replied_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "customer_feedback_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "customer_feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "customer_feedback_user_id_idx" ON "customer_feedback"("user_id");
CREATE INDEX IF NOT EXISTS "customer_feedback_status_idx" ON "customer_feedback"("status");
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'FEEDBACK_UPDATED';
