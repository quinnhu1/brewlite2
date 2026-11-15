-- DESTRUCTIVE, local development only. The PowerShell wrapper backs up first.
-- Deliberately no DDL and no touching _prisma_migrations or users.
BEGIN;
DO $$ BEGIN
 IF current_setting('brewlite.confirm_reset', true) IS DISTINCT FROM 'RESET_DEMO_DATA' THEN
   RAISE EXCEPTION 'Reset blocked. Use scripts/Reset-DemoData.ps1 after backing up.';
 END IF;
END $$;
DELETE FROM loyalty_transactions;
DELETE FROM payments;
DELETE FROM order_item_toppings;
DELETE FROM order_items;
DELETE FROM orders;
DELETE FROM product_toppings;
DELETE FROM product_size;
DELETE FROM products;
DELETE FROM toppings;
DELETE FROM promotions;
-- Only the five known plaintext dummy accounts from the original seed are removed.
DELETE FROM users WHERE password LIKE 'DEMO_PASSWORD_%' AND user_id IN (
'f47ac10b-58cc-4372-a567-0e02b2c3d479','c9a646d3-9c61-4cd9-bc15-4581bf762d78',
'd3b07384-d113-4f44-9840-000000000001','6ba7b810-9dad-11d1-80b4-00c04fd430c8',
'7d444840-9dc0-11d1-b245-5ffdce74fad2');
UPDATE users SET point=0;
COMMIT;
