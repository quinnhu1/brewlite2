-- Auth hardening: server-side session revocation and brute-force protection.
-- `users_email_lower_key` and `users_role_check` already ship with
-- 20261102000000_checkout_integrity; this migration only adds the state that
-- the login/change-password flows need.
ALTER TABLE "users" ADD COLUMN "token_version" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN "failed_login_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN "locked_until" TIMESTAMPTZ(6);
