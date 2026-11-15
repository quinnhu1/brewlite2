-- Refund receipts (Đức Long, D2). Additive: no existing table or row is changed.
-- Scope: at most one full refund per payment. Mock/free refunds complete inside the cancel transaction;
-- an external gateway refund must stay 'pending' until the gateway confirms it.
CREATE TYPE "refund_status_enum" AS ENUM ('pending', 'succeeded', 'failed');

CREATE TABLE "refunds" (
    "refund_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "payment_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "idempotency_key" VARCHAR(255) NOT NULL,
    "request_hash" VARCHAR(64) NOT NULL,
    "amount" DECIMAL(10,0) NOT NULL,
    "status" "refund_status_enum" NOT NULL DEFAULT 'pending',
    "provider" VARCHAR(20) NOT NULL,
    "reason" VARCHAR(255) NOT NULL,
    "requested_by" UUID NOT NULL,
    "requested_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),
    "provider_ref" VARCHAR(100),

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("refund_id"),
    -- A refund never exceeds what was charged and is never negative.
    CONSTRAINT "refunds_amount_nonnegative" CHECK ("amount" >= 0),
    -- A succeeded refund must record when it completed.
    CONSTRAINT "refunds_completed_when_succeeded" CHECK ("status" <> 'succeeded' OR "completed_at" IS NOT NULL)
);

CREATE UNIQUE INDEX "refunds_payment_id_key" ON "refunds"("payment_id");
CREATE UNIQUE INDEX "refunds_idempotency_key_key" ON "refunds"("idempotency_key");
CREATE UNIQUE INDEX "refunds_provider_ref_key" ON "refunds"("provider_ref");
CREATE INDEX "refunds_order_id_idx" ON "refunds"("order_id");
CREATE INDEX "refunds_requested_by_idx" ON "refunds"("requested_by");

ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("payment_id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("order_id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE NO ACTION;
