-- CreateEnum
CREATE TYPE "discount_type_enum" AS ENUM ('percentage', 'fixed');

-- CreateEnum
CREATE TYPE "loyalty_type_enum" AS ENUM ('EARN', 'REDEEM', 'EXPIRE', 'ADJUST');

-- CreateEnum
CREATE TYPE "order_status" AS ENUM ('pending', 'confirmed', 'processing', 'preparing', 'shipping', 'delivering', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "payment_method_enum" AS ENUM ('cash', 'momo', 'vnpay', 'banking');

-- CreateEnum
CREATE TYPE "payment_status_enum" AS ENUM ('pending', 'success', 'failed', 'refunded');

-- CreateTable
CREATE TABLE "products" (
    "product_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_name" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "base_price" DECIMAL(10,0) NOT NULL,
    "image_url" TEXT,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "products_pkey" PRIMARY KEY ("product_id")
);

-- CreateTable
CREATE TABLE "loyalty_transactions" (
    "loyalty_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "order_id" UUID,
    "loyalty_point" INTEGER NOT NULL,
    "type" "loyalty_type_enum" NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loyalty_transactions_pkey" PRIMARY KEY ("loyalty_id")
);

-- CreateTable
CREATE TABLE "order_item_toppings" (
    "oit_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orderitem_id" UUID NOT NULL,
    "topping_id" UUID NOT NULL,
    "topping_name" VARCHAR(50) NOT NULL,
    "price" DECIMAL(10,0) NOT NULL,

    CONSTRAINT "order_item_toppings_pkey" PRIMARY KEY ("oit_id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "orderitem_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "product_name" VARCHAR(50) NOT NULL,
    "size" VARCHAR(2) NOT NULL,
    "unit_price" DECIMAL(10,0) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "line_total" DECIMAL(10,0) NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("orderitem_id")
);

-- CreateTable
CREATE TABLE "orders" (
    "order_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_code" VARCHAR(30) NOT NULL,
    "user_id" UUID NOT NULL,
    "promotion_id" UUID,
    "status" "order_status" NOT NULL DEFAULT 'pending',
    "subtotal" DECIMAL(10,0) NOT NULL,
    "discount" DECIMAL(10,0) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,0) NOT NULL,
    "created" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("order_id")
);

-- CreateTable
CREATE TABLE "payments" (
    "payment_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "idempotency_key" VARCHAR(255) NOT NULL,
    "amount" DECIMAL(10,0) NOT NULL,
    "method" "payment_method_enum" NOT NULL,
    "status" "payment_status_enum" NOT NULL,
    "transaction_id" VARCHAR(255),
    "paid_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("payment_id")
);

-- CreateTable
CREATE TABLE "product_size" (
    "size_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "size" VARCHAR(2) NOT NULL,
    "add_price" DECIMAL(7,2) NOT NULL DEFAULT 0,

    CONSTRAINT "product_size_pkey" PRIMARY KEY ("size_id")
);

-- CreateTable
CREATE TABLE "product_toppings" (
    "product_id" UUID NOT NULL,
    "topping_id" UUID NOT NULL,

    CONSTRAINT "pk_product_toppings" PRIMARY KEY ("product_id","topping_id")
);

-- CreateTable
CREATE TABLE "promotions" (
    "promotion_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(50) NOT NULL,
    "promotion_name" VARCHAR(100) NOT NULL,
    "discount_type" "discount_type_enum" NOT NULL,
    "discount_value" DECIMAL(10,0) NOT NULL,
    "min_amount" DECIMAL(10,0) NOT NULL DEFAULT 0,
    "max_discount" DECIMAL(10,0),
    "start_at" TIMESTAMPTZ(6) NOT NULL,
    "end_at" TIMESTAMPTZ(6) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("promotion_id")
);

-- CreateTable
CREATE TABLE "toppings" (
    "topping_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "topping_name" VARCHAR(50) NOT NULL,
    "price" DECIMAL(10,0) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "toppings_pkey" PRIMARY KEY ("topping_id")
);

-- CreateTable
CREATE TABLE "users" (
    "user_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(50) NOT NULL,
    "phone" VARCHAR(10) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "point" INTEGER NOT NULL DEFAULT 0,
    "email" VARCHAR(50) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE INDEX "idx_loyalty_order" ON "loyalty_transactions"("order_id");

-- CreateIndex
CREATE INDEX "idx_loyalty_user" ON "loyalty_transactions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_code_key" ON "orders"("order_code");

-- CreateIndex
CREATE UNIQUE INDEX "payments_idempotency_key_key" ON "payments"("idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "payments_transaction_id_key" ON "payments"("transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_product_size_product_size" ON "product_size"("product_id", "size");

-- CreateIndex
CREATE UNIQUE INDEX "promotions_code_key" ON "promotions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "idx_users_email" ON "users"("email");

-- AddForeignKey
ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("order_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_item_toppings" ADD CONSTRAINT "order_item_toppings_orderitem_id_fkey" FOREIGN KEY ("orderitem_id") REFERENCES "order_items"("orderitem_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_item_toppings" ADD CONSTRAINT "order_item_toppings_topping_id_fkey" FOREIGN KEY ("topping_id") REFERENCES "toppings"("topping_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("order_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("product_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "fk_orders_promotions" FOREIGN KEY ("promotion_id") REFERENCES "promotions"("promotion_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "fk_orders_users" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("order_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "product_size" ADD CONSTRAINT "fk_product_size_products" FOREIGN KEY ("product_id") REFERENCES "products"("product_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_toppings" ADD CONSTRAINT "fk_pt_product" FOREIGN KEY ("product_id") REFERENCES "products"("product_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "product_toppings" ADD CONSTRAINT "fk_pt_topping" FOREIGN KEY ("topping_id") REFERENCES "toppings"("topping_id") ON DELETE CASCADE ON UPDATE NO ACTION;
