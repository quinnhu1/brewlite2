-- Task 5/6/8: persisted checkout details and payment/order statuses.
-- Keep this migration additive so existing demo orders remain valid.
ALTER TYPE "order_status" ADD VALUE IF NOT EXISTS 'paid' AFTER 'pending';
ALTER TYPE "order_status" ADD VALUE IF NOT EXISTS 'payment_failed' AFTER 'paid';
ALTER TYPE "order_status" ADD VALUE IF NOT EXISTS 'ready' AFTER 'preparing';

ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "pickup_method" VARCHAR(20);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "customer_name" VARCHAR(100);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "customer_phone" VARCHAR(20);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "delivery_address" VARCHAR(500);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "order_note" VARCHAR(500);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "scheduled_at" TIMESTAMPTZ(6);

ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "note" VARCHAR(500);
