-- Read-only checks before applying checkout_integrity to an existing database.
SELECT lower(email) AS duplicate_email, count(*) FROM users GROUP BY lower(email) HAVING count(*) > 1;
SELECT order_id, count(*) FROM payments WHERE status='success' GROUP BY order_id HAVING count(*) > 1;
SELECT order_id, count(*) FROM payments WHERE status='pending' GROUP BY order_id HAVING count(*) > 1;
SELECT order_id, count(*) FROM loyalty_transactions WHERE type='EARN' GROUP BY order_id HAVING count(*) > 1;
SELECT o.order_code, o.subtotal, coalesce(sum(i.line_total),0) AS item_sum
FROM orders o LEFT JOIN order_items i USING(order_id) GROUP BY o.order_id
HAVING o.subtotal <> coalesce(sum(i.line_total),0);
SELECT code, discount_type, discount_value FROM promotions WHERE discount_type='percentage' AND (discount_value < 0 OR discount_value > 100);
SELECT product_id, product_name FROM products p WHERE NOT EXISTS(SELECT 1 FROM product_size s WHERE s.product_id=p.product_id);
-- Snapshot money: unit_price includes size, topping price is added per serving.
SELECT i.orderitem_id,i.line_total,(i.unit_price+coalesce(t.topping_sum,0))*i.quantity AS expected
FROM order_items i LEFT JOIN (SELECT orderitem_id,sum(price) topping_sum FROM order_item_toppings GROUP BY orderitem_id) t USING(orderitem_id)
WHERE i.line_total<>(i.unit_price+coalesce(t.topping_sum,0))*i.quantity;
SELECT o.order_code,o.status,l.loyalty_point FROM orders o JOIN loyalty_transactions l USING(order_id)
WHERE l.type='EARN' AND o.status IN ('pending','payment_failed');
SELECT payment_id,status,paid_at FROM payments WHERE status IN ('pending','failed') AND paid_at IS NOT NULL;
