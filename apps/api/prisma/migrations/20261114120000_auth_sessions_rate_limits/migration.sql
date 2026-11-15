ALTER TABLE "users" ADD COLUMN "auth_version" INTEGER NOT NULL DEFAULT 0;
CREATE TABLE "auth_rate_limits" (
  "bucket_key" VARCHAR(64) PRIMARY KEY,
  "hits" INTEGER NOT NULL,
  "expires_at" TIMESTAMPTZ(6) NOT NULL
);
CREATE INDEX "auth_rate_limits_expires_at_idx" ON "auth_rate_limits" ("expires_at");
