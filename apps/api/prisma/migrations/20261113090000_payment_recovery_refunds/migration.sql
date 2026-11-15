ALTER TABLE orders ADD COLUMN cancellation_requested_at timestamptz,
 ADD COLUMN cancellation_reason varchar(500), ADD COLUMN replacement_of_order_id uuid REFERENCES orders(order_id);
CREATE INDEX orders_replacement_idx ON orders(replacement_of_order_id);
ALTER TABLE payments ADD COLUMN merchant_code varchar(8), ADD COLUMN gateway_create_date varchar(14),
 ADD COLUMN last_checked_at timestamptz, ADD COLUMN next_check_at timestamptz,
 ADD COLUMN check_attempts integer NOT NULL DEFAULT 0,
 ADD COLUMN review_required boolean NOT NULL DEFAULT false,
 ADD COLUMN reconciliation_note varchar(500);
CREATE INDEX payments_status_next_check_at_idx ON payments(status,next_check_at);
CREATE TYPE refund_status_enum AS ENUM ('requested','processing','succeeded','failed','review_required');
CREATE TABLE refunds (
 refund_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES orders(order_id),
 payment_id uuid NOT NULL UNIQUE REFERENCES payments(payment_id), request_id varchar(32) NOT NULL UNIQUE,
 amount numeric(10,0) NOT NULL CHECK (amount >= 0), provider varchar(20) NOT NULL,
 status refund_status_enum NOT NULL DEFAULT 'requested', reason varchar(500) NOT NULL,
 requested_by uuid NOT NULL REFERENCES users(user_id), requested_at timestamptz NOT NULL DEFAULT now(),
 submitted_at timestamptz, completed_at timestamptz, next_check_at timestamptz,
 check_attempts integer NOT NULL DEFAULT 0, provider_ref varchar(100), response_code varchar(2),
 provider_status varchar(2), message varchar(500)
);
CREATE INDEX refunds_status_next_check_at_idx ON refunds(status,next_check_at);
