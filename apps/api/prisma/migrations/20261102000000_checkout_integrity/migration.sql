-- Additive migration. Existing orders are NOT treated as stock reservations.
ALTER TABLE orders ADD COLUMN checkout_key VARCHAR(255);
ALTER TABLE orders ADD COLUMN request_hash VARCHAR(64);
ALTER TABLE orders ADD COLUMN stock_reserved BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE orders ADD COLUMN expires_at TIMESTAMPTZ(6);
CREATE UNIQUE INDEX orders_checkout_key_key ON orders(checkout_key);
CREATE INDEX orders_user_id_created_idx ON orders(user_id, created);
CREATE INDEX orders_status_expires_at_idx ON orders(status, expires_at);

ALTER TABLE payments ADD COLUMN request_hash VARCHAR(64);
ALTER TABLE payments ADD COLUMN provider VARCHAR(20) NOT NULL DEFAULT 'legacy';
ALTER TABLE payments ADD COLUMN gateway_ref VARCHAR(100);
ALTER TABLE payments ADD COLUMN payment_url TEXT;
ALTER TABLE payments ADD COLUMN expires_at TIMESTAMPTZ(6);
ALTER TABLE payments ADD COLUMN bank_code VARCHAR(20);
ALTER TABLE payments ADD COLUMN response_code VARCHAR(2);
CREATE UNIQUE INDEX payments_gateway_ref_key ON payments(gateway_ref);
CREATE INDEX payments_order_id_created_at_idx ON payments(order_id, created_at);
-- At most one outstanding gateway session and one successful charge per order.
-- Historical inconsistent demo rows must be audited before applying these indexes.
CREATE UNIQUE INDEX payments_one_pending_per_order ON payments(order_id) WHERE status = 'pending';
CREATE UNIQUE INDEX payments_one_success_per_order ON payments(order_id) WHERE status = 'success';
CREATE UNIQUE INDEX loyalty_one_earn_per_order ON loyalty_transactions(order_id) WHERE type = 'EARN';

ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'customer';
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK(role IN ('customer','staff','admin'));
-- Keep case-insensitive uniqueness in PostgreSQL, including concurrent registration.
-- Duplicate historical emails cause a clear migration failure; do not silently delete accounts.
CREATE UNIQUE INDEX users_email_lower_key ON users(lower(email));

-- NOT VALID allows audit/cleanup of historical demo rows, while new writes are checked.
ALTER TABLE products ADD CONSTRAINT products_stock_nonnegative CHECK(stock >= 0) NOT VALID;
ALTER TABLE products ADD CONSTRAINT products_price_nonnegative CHECK(base_price >= 0) NOT VALID;
ALTER TABLE order_items ADD CONSTRAINT order_items_quantity_positive CHECK(quantity > 0) NOT VALID;
ALTER TABLE orders ADD CONSTRAINT orders_amount_consistent CHECK(subtotal >= 0 AND discount >= 0 AND discount <= subtotal AND total = subtotal-discount) NOT VALID;
ALTER TABLE promotions ADD CONSTRAINT promotions_percentage_range CHECK(discount_value >= 0 AND (discount_type <> 'percentage' OR discount_value <= 100)) NOT VALID;
