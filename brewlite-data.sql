--
-- PostgreSQL database dump
--

\restrict 0EWmCoJBsSm1yuhZFQmcPk41DR485Vc0Z7dql1QX2jOXJwmWqk7334h2Yywjj2g

-- Dumped from database version 16.15 (Debian 16.15-1.pgdg13+2)
-- Dumped by pg_dump version 16.15 (Debian 16.15-1.pgdg13+2)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: promotions; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.promotions (promotion_id, code, promotion_name, discount_type, discount_value, min_amount, max_discount, start_at, end_at, is_active) VALUES ('e2a7b8c9-1111-4222-8333-000000000001', 'GIAM15K', 'Giảm 15k cho đơn từ 50k', 'fixed', 15000, 50000, 15000, '2026-09-30 17:00:00+00', '2026-10-31 16:59:59+00', true);
INSERT INTO public.promotions (promotion_id, code, promotion_name, discount_type, discount_value, min_amount, max_discount, start_at, end_at, is_active) VALUES ('e2a7b8c9-1111-4222-8333-000000000002', 'GIAM20K', 'Giảm 20k cho đơn từ 100k', 'fixed', 20000, 100000, 20000, '2026-09-30 17:00:00+00', '2026-10-31 16:59:59+00', true);
INSERT INTO public.promotions (promotion_id, code, promotion_name, discount_type, discount_value, min_amount, max_discount, start_at, end_at, is_active) VALUES ('e2a7b8c9-1111-4222-8333-000000000003', 'SALE10%', 'Giảm 10% tổng hóa đơn', 'percentage', 10, 50000, 50000, '2026-09-30 17:00:00+00', '2026-10-31 16:59:59+00', true);
INSERT INTO public.promotions (promotion_id, code, promotion_name, discount_type, discount_value, min_amount, max_discount, start_at, end_at, is_active) VALUES ('c3333333-3333-4333-8333-000000000001', 'BREW10', 'Giảm 10% tối đa 15.000đ', 'percentage', 10, 50000, 15000, '2025-12-31 17:00:00+00', '2029-12-31 17:00:00+00', true);
INSERT INTO public.promotions (promotion_id, code, promotion_name, discount_type, discount_value, min_amount, max_discount, start_at, end_at, is_active) VALUES ('c3333333-3333-4333-8333-000000000002', 'BREW15K', 'Giảm 15.000đ cho đơn từ 100.000đ', 'fixed', 15000, 100000, 15000, '2025-12-31 17:00:00+00', '2029-12-31 17:00:00+00', true);


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.users (user_id, name, phone, password, point, email, role) VALUES ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Nguyen Van An', '0910000001', 'DEMO_PASSWORD_01', 50, 'user01@example.com', 'customer');
INSERT INTO public.users (user_id, name, phone, password, point, email, role) VALUES ('c9a646d3-9c61-4cd9-bc15-4581bf762d78', 'Tran Thi Binh', '0910000002', 'DEMO_PASSWORD_02', 120, 'user02@example.com', 'customer');
INSERT INTO public.users (user_id, name, phone, password, point, email, role) VALUES ('d3b07384-d113-4f44-9840-000000000001', 'Le Hoang Cuong', '0910000003', 'DEMO_PASSWORD_03', 80, 'user03@example.com', 'customer');
INSERT INTO public.users (user_id, name, phone, password, point, email, role) VALUES ('6ba7b810-9dad-11d1-80b4-00c04fd430c8', 'Pham Thu Dung', '0910000004', 'DEMO_PASSWORD_04', 200, 'user04@example.com', 'customer');
INSERT INTO public.users (user_id, name, phone, password, point, email, role) VALUES ('7d444840-9dc0-11d1-b245-5ffdce74fad2', 'Hoang Minh Duc', '0910000005', 'DEMO_PASSWORD_05', 15, 'user05@example.com', 'customer');
INSERT INTO public.users (user_id, name, phone, password, point, email, role) VALUES ('ee9447a8-85ea-49f9-bd7a-a9d8ea0d6c04', 'Min Chịu', '0828767182', '$2b$10$VlP9JnlfO8zsEUKOYyXrju2eBWWIQPGkIl9DG7LWv/3WLIrbpnvje', 0, 'nguyenminhtrieu07112006@gmail.com', 'customer');
INSERT INTO public.users (user_id, name, phone, password, point, email, role) VALUES ('037a609a-a759-45e2-867b-d32f7c2b59fe', 'ABC', '0100200300', '$2b$10$/35RYwT5gLROBidLPXi0P.klF02b/uF4QFqYYnIRZeW6G5SqaZdLG', 42, 'abc@gmail.com', 'customer');


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.orders (order_id, order_code, user_id, promotion_id, status, subtotal, discount, total, created, pickup_method, customer_name, customer_phone, delivery_address, order_note, scheduled_at, checkout_key, request_hash, stock_reserved, expires_at) VALUES ('a1b2c3d4-0001-4000-8000-000000000001', 'ORD-20261001-0001', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', NULL, 'completed', 50000, 0, 50000, '2026-10-01 01:15:00+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL);
INSERT INTO public.orders (order_id, order_code, user_id, promotion_id, status, subtotal, discount, total, created, pickup_method, customer_name, customer_phone, delivery_address, order_note, scheduled_at, checkout_key, request_hash, stock_reserved, expires_at) VALUES ('a1b2c3d4-0002-4000-8000-000000000002', 'ORD-20261001-0002', 'c9a646d3-9c61-4cd9-bc15-4581bf762d78', 'e2a7b8c9-1111-4222-8333-000000000001', 'completed', 85000, 15000, 70000, '2026-10-01 02:30:00+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL);
INSERT INTO public.orders (order_id, order_code, user_id, promotion_id, status, subtotal, discount, total, created, pickup_method, customer_name, customer_phone, delivery_address, order_note, scheduled_at, checkout_key, request_hash, stock_reserved, expires_at) VALUES ('a1b2c3d4-0003-4000-8000-000000000003', 'ORD-20261002-0003', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', NULL, 'cancelled', 40000, 0, 40000, '2026-10-02 03:10:00+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL);
INSERT INTO public.orders (order_id, order_code, user_id, promotion_id, status, subtotal, discount, total, created, pickup_method, customer_name, customer_phone, delivery_address, order_note, scheduled_at, checkout_key, request_hash, stock_reserved, expires_at) VALUES ('a1b2c3d4-0004-4000-8000-000000000004', 'ORD-20261002-0004', 'd3b07384-d113-4f44-9840-000000000001', 'e2a7b8c9-1111-4222-8333-000000000002', 'completed', 120000, 20000, 100000, '2026-10-02 04:45:00+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL);
INSERT INTO public.orders (order_id, order_code, user_id, promotion_id, status, subtotal, discount, total, created, pickup_method, customer_name, customer_phone, delivery_address, order_note, scheduled_at, checkout_key, request_hash, stock_reserved, expires_at) VALUES ('5e58da94-a86a-416e-a050-a1e89f29cc6e', 'BL-20261027-81D792', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', NULL, 'paid', 35000, 0, 35000, '2026-10-27 18:37:05.323+00', 'AT_COUNTER', 'Nguyen Van An', '0910000001', NULL, NULL, NULL, NULL, NULL, false, NULL);
INSERT INTO public.orders (order_id, order_code, user_id, promotion_id, status, subtotal, discount, total, created, pickup_method, customer_name, customer_phone, delivery_address, order_note, scheduled_at, checkout_key, request_hash, stock_reserved, expires_at) VALUES ('2364ef46-7a1f-49f1-88f8-2be881bc5706', 'BL-20261028-503FE9', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', NULL, 'paid', 80000, 0, 80000, '2026-10-28 06:00:04.606+00', 'AT_COUNTER', 'Nguyễn Minh Triệu', '+84828767182', 'To 15, Ap Tan Thanh, Tan Phu, Tan Phu Do ng, Tien Giang; To 15, Ap Tan Thanh, Tan Phu, Tan Phu Dong, Tien Giang', NULL, NULL, NULL, NULL, false, NULL);
INSERT INTO public.orders (order_id, order_code, user_id, promotion_id, status, subtotal, discount, total, created, pickup_method, customer_name, customer_phone, delivery_address, order_note, scheduled_at, checkout_key, request_hash, stock_reserved, expires_at) VALUES ('873b21ab-fb3c-41bd-8fdc-cfec8327bb79', 'BL-20261028-7DFC50', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', NULL, 'paid', 273000, 0, 273000, '2026-10-28 06:01:53.177+00', 'AT_COUNTER', 'Minh Thiên', '+84857672118', 'To 15, Ap Tan Thanh, Tan Phu, Tan Phu Do ng, Tien Giang; To 15, Ap Tan Thanh, Tan Phu, Tan Phu Dong, Tien Giang', NULL, '2026-10-28 07:01:00+00', NULL, NULL, false, NULL);
INSERT INTO public.orders (order_id, order_code, user_id, promotion_id, status, subtotal, discount, total, created, pickup_method, customer_name, customer_phone, delivery_address, order_note, scheduled_at, checkout_key, request_hash, stock_reserved, expires_at) VALUES ('3fa4edd9-7bd8-494f-a10e-0900facb2484', 'BL-20261028-BBEAB2', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', NULL, 'paid', 750000, 0, 750000, '2026-10-28 07:17:36.676+00', 'AT_COUNTER', 'Nguyễn Minh Triệu', '+84828767182', 'To 15, Ap Tan Thanh, Tan Phu, Tan Phu Do ng, Tien Giang; To 15, Ap Tan Thanh, Tan Phu, Tan Phu Dong, Tien Giang', NULL, '2026-10-28 08:17:00+00', NULL, NULL, false, NULL);
INSERT INTO public.orders (order_id, order_code, user_id, promotion_id, status, subtotal, discount, total, created, pickup_method, customer_name, customer_phone, delivery_address, order_note, scheduled_at, checkout_key, request_hash, stock_reserved, expires_at) VALUES ('30ad68c2-361a-4d24-a175-20d70a23fb34', 'BL-20261101-8638D9', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', NULL, 'paid', 1050000, 0, 1050000, '2026-11-01 17:42:51.096+00', 'AT_COUNTER', 'Nguyễn Minh Triệu', '0828767182', 'To 15, Ap Tan Thanh, Tan Phu, Tan Phu Do ng, Tien Giang; To 15, Ap Tan Thanh, Tan Phu, Tan Phu Dong, Tien Giang', NULL, '2026-11-01 18:42:00+00', NULL, NULL, false, NULL);
INSERT INTO public.orders (order_id, order_code, user_id, promotion_id, status, subtotal, discount, total, created, pickup_method, customer_name, customer_phone, delivery_address, order_note, scheduled_at, checkout_key, request_hash, stock_reserved, expires_at) VALUES ('57a4b378-293c-4387-957d-81eb53655b52', 'BL-20261101-054042', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', NULL, 'paid', 1564000, 0, 1564000, '2026-11-01 17:43:47.519+00', 'DELIVERY', 'Minh Thiên', '+84857672118', 'To 15, Ap Tan Thanh, Tan Phu, Tan Phu Do ng, Tien Giang; To 15, Ap Tan Thanh, Tan Phu, Tan Phu Dong, Tien Giang', NULL, NULL, NULL, NULL, false, NULL);
INSERT INTO public.orders (order_id, order_code, user_id, promotion_id, status, subtotal, discount, total, created, pickup_method, customer_name, customer_phone, delivery_address, order_note, scheduled_at, checkout_key, request_hash, stock_reserved, expires_at) VALUES ('ee19e51f-30d2-4557-a02d-53f24c71b5ad', 'BL-20261101-596AB0', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', NULL, 'paid', 648000, 0, 648000, '2026-11-01 17:45:57.371+00', 'AT_COUNTER', 'Minh Thiên', '+84857672118', 'To 15, Ap Tan Thanh, Tan Phu, Tan Phu Do ng, Tien Giang; To 15, Ap Tan Thanh, Tan Phu, Tan Phu Dong, Tien Giang', NULL, NULL, NULL, NULL, false, NULL);
INSERT INTO public.orders (order_id, order_code, user_id, promotion_id, status, subtotal, discount, total, created, pickup_method, customer_name, customer_phone, delivery_address, order_note, scheduled_at, checkout_key, request_hash, stock_reserved, expires_at) VALUES ('77919099-6c9b-4a02-ba0a-c275952e1ded', 'BL-20261102-FF0039F2D3', '037a609a-a759-45e2-867b-d32f7c2b59fe', 'c3333333-3333-4333-8333-000000000001', 'paid', 440000, 15000, 425000, '2026-11-02 09:28:53.996+00', 'AT_COUNTER', 'ABC', '0100200300', NULL, NULL, '2026-11-02 10:28:00+00', '2040a471-7978-4d7d-921b-ec5e07fa0d62', '74fb9bd363e335cf58f3ebfc2d8d382b7eeb8215f861d942a3c2b315cc650875', false, '2026-11-02 09:48:53.934+00');
INSERT INTO public.orders (order_id, order_code, user_id, promotion_id, status, subtotal, discount, total, created, pickup_method, customer_name, customer_phone, delivery_address, order_note, scheduled_at, checkout_key, request_hash, stock_reserved, expires_at) VALUES ('d7537331-ac2e-4aaf-8af9-ba300e5fc512', 'BL-20261102-79FA9702FE', '037a609a-a759-45e2-867b-d32f7c2b59fe', 'c3333333-3333-4333-8333-000000000001', 'cancelled', 1800000, 15000, 1785000, '2026-11-02 09:43:28.111+00', 'AT_COUNTER', 'ABC', '0100200300', NULL, NULL, '2026-11-02 11:43:00+00', '53cff2ad-845c-4555-bb80-f1961abdd6e6', 'adbbe0f27db9cbb2476345a58404c1784af1db2c04101b3d3de4236307c37711', false, '2026-11-02 10:03:28.056+00');
INSERT INTO public.orders (order_id, order_code, user_id, promotion_id, status, subtotal, discount, total, created, pickup_method, customer_name, customer_phone, delivery_address, order_note, scheduled_at, checkout_key, request_hash, stock_reserved, expires_at) VALUES ('70e9843a-90d1-406b-bf53-8b9baabe3773', 'BL-20261102-DFF525F3D5', '037a609a-a759-45e2-867b-d32f7c2b59fe', NULL, 'cancelled', 140000, 0, 140000, '2026-11-02 09:30:54.308+00', 'DELIVERY', 'ABC', '0100200300', '8 bà huyện thanh quan', NULL, '2026-11-02 11:30:00+00', 'a5b36275-8cc7-42bd-963f-66c99402686f', '923c7d6d09a62a262934e8e8be490c013ec71d863319250b611e385bf4e4415c', false, '2026-11-02 09:50:54.267+00');


--
-- Data for Name: loyalty_transactions; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.loyalty_transactions (loyalty_id, user_id, order_id, loyalty_point, type, description, created_at) VALUES ('e1b2c3d4-0001-4000-8000-000000000001', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 'a1b2c3d4-0001-4000-8000-000000000001', 50, 'EARN', 'Cộng điểm khi hoàn thành đơn hàng', '2026-10-22 10:28:38.755558+00');
INSERT INTO public.loyalty_transactions (loyalty_id, user_id, order_id, loyalty_point, type, description, created_at) VALUES ('e1b2c3d4-0002-4000-8000-000000000002', 'c9a646d3-9c61-4cd9-bc15-4581bf762d78', 'a1b2c3d4-0002-4000-8000-000000000002', 30, 'EARN', 'Cộng điểm khi hoàn thành đơn hàng', '2026-10-22 10:28:38.755558+00');
INSERT INTO public.loyalty_transactions (loyalty_id, user_id, order_id, loyalty_point, type, description, created_at) VALUES ('0b624a88-186b-472c-ac8a-19da4514946d', '037a609a-a759-45e2-867b-d32f7c2b59fe', '77919099-6c9b-4a02-ba0a-c275952e1ded', 42, 'EARN', 'Tích điểm đơn BL-20261102-FF0039F2D3', '2026-11-02 09:28:54.097+00');
INSERT INTO public.loyalty_transactions (loyalty_id, user_id, order_id, loyalty_point, type, description, created_at) VALUES ('060c68f1-cd67-4494-8546-71037e5044ad', '037a609a-a759-45e2-867b-d32f7c2b59fe', '70e9843a-90d1-406b-bf53-8b9baabe3773', 14, 'EARN', 'Tích điểm đơn BL-20261102-DFF525F3D5', '2026-11-02 09:30:54.391+00');
INSERT INTO public.loyalty_transactions (loyalty_id, user_id, order_id, loyalty_point, type, description, created_at) VALUES ('1ef607b7-2e30-4427-8331-e3155c89865c', '037a609a-a759-45e2-867b-d32f7c2b59fe', '70e9843a-90d1-406b-bf53-8b9baabe3773', -14, 'ADJUST', 'Thu hồi điểm đơn đã hoàn tiền BL-20261102-DFF525F3D5', '2026-11-02 09:31:11.543+00');
INSERT INTO public.loyalty_transactions (loyalty_id, user_id, order_id, loyalty_point, type, description, created_at) VALUES ('68482bec-6d78-45d9-8e71-5123071411c7', '037a609a-a759-45e2-867b-d32f7c2b59fe', 'd7537331-ac2e-4aaf-8af9-ba300e5fc512', 178, 'EARN', 'Tích điểm đơn BL-20261102-79FA9702FE', '2026-11-02 09:43:28.211+00');
INSERT INTO public.loyalty_transactions (loyalty_id, user_id, order_id, loyalty_point, type, description, created_at) VALUES ('5a6ace74-48fa-4bf5-aaed-3f31c38321ba', '037a609a-a759-45e2-867b-d32f7c2b59fe', 'd7537331-ac2e-4aaf-8af9-ba300e5fc512', -178, 'ADJUST', 'Thu hồi điểm đơn đã hoàn tiền BL-20261102-79FA9702FE', '2026-11-02 09:43:55.381+00');


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.products (product_id, product_name, description, base_price, image_url, stock, version, is_active, categories) VALUES ('11111111-1111-4111-8111-111111111102', 'Trà sữa ô long', 'Trà sữa ô long thượng hạng thơm mát', 28000, 'https://example.com/images/ts-olong.jpg', 80, 1, true, 'Tea');
INSERT INTO public.products (product_id, product_name, description, base_price, image_url, stock, version, is_active, categories) VALUES ('11111111-1111-4111-8111-111111111103', 'Trà sữa thái xanh', 'Trà sữa thái xanh béo ngậy đặc trưng', 26000, 'https://example.com/images/ts-thaixanh.jpg', 50, 1, true, 'Tea');
INSERT INTO public.products (product_id, product_name, description, base_price, image_url, stock, version, is_active, categories) VALUES ('11111111-1111-4111-8111-111111111104', 'Trà sữa khoai môn', 'Trà sữa vị khoai môn ngọt dịu tự nhiên', 30000, 'https://example.com/images/ts-khoaimon.jpg', 60, 1, true, 'Tea');
INSERT INTO public.products (product_id, product_name, description, base_price, image_url, stock, version, is_active, categories) VALUES ('11111111-1111-4111-8111-111111111105', 'Trà sữa matcha', 'Trà sữa vị matcha Nhật Bản thanh tao', 32000, 'https://example.com/images/ts-matcha.jpg', 45, 1, true, 'Tea');
INSERT INTO public.products (product_id, product_name, description, base_price, image_url, stock, version, is_active, categories) VALUES ('11111111-1111-4111-8111-111111111106', 'Hồng trà kem trứng', 'Hồng trà kết hợp lớp kem trứng béo ngậy', 35000, 'https://example.com/images/ht-kemtrung.jpg', 30, 1, true, 'Tea');
INSERT INTO public.products (product_id, product_name, description, base_price, image_url, stock, version, is_active, categories) VALUES ('11111111-1111-4111-8111-111111111107', 'Lục trà lài', 'Lục trà thanh mát hương hoa lài dịu nhẹ', 22000, 'https://example.com/images/lt-lai.jpg', 120, 1, true, 'Tea');
INSERT INTO public.products (product_id, product_name, description, base_price, image_url, stock, version, is_active, categories) VALUES ('c1111111-1111-4111-8111-000000000001', 'Espresso', 'Espresso đậm vị, phục vụ nóng.', 29000, '/images/products/espresso.svg', 50, 1, true, 'Classic Coffee');
INSERT INTO public.products (product_id, product_name, description, base_price, image_url, stock, version, is_active, categories) VALUES ('c1111111-1111-4111-8111-000000000002', 'Americano', 'Espresso và nước lọc, phục vụ cùng đá.', 32000, '/images/products/americano.svg', 50, 1, true, 'Classic Coffee');
INSERT INTO public.products (product_id, product_name, description, base_price, image_url, stock, version, is_active, categories) VALUES ('c1111111-1111-4111-8111-000000000003', 'Cappuccino', 'Espresso cùng sữa và bọt sữa mịn.', 39000, '/images/products/cappuccino.svg', 50, 1, true, 'Classic Coffee');
INSERT INTO public.products (product_id, product_name, description, base_price, image_url, stock, version, is_active, categories) VALUES ('c1111111-1111-4111-8111-000000000004', 'Latte', 'Espresso kết hợp sữa tươi, vị nhẹ.', 39000, '/images/products/latte.svg', 50, 1, true, 'Classic Coffee');
INSERT INTO public.products (product_id, product_name, description, base_price, image_url, stock, version, is_active, categories) VALUES ('c1111111-1111-4111-8111-000000000005', 'Cà phê sữa đá', 'Cà phê phin kết hợp sữa đặc và đá.', 29000, '/images/products/ca-phe-sua.svg', 50, 1, true, 'Classic Coffee');
INSERT INTO public.products (product_id, product_name, description, base_price, image_url, stock, version, is_active, categories) VALUES ('c1111111-1111-4111-8111-000000000006', 'Bạc xỉu', 'Sữa đặc, sữa tươi và một ít cà phê.', 29000, '/images/products/bac-xiu.svg', 50, 1, true, 'Classic Coffee');
INSERT INTO public.products (product_id, product_name, description, base_price, image_url, stock, version, is_active, categories) VALUES ('c1111111-1111-4111-8111-000000000008', 'Cold Brew Sữa Tươi', 'Cà phê ủ lạnh kết hợp sữa tươi.', 39000, '/images/products/cold-brew-milk.svg', 50, 1, true, 'Cold & Brewed');
INSERT INTO public.products (product_id, product_name, description, base_price, image_url, stock, version, is_active, categories) VALUES ('c1111111-1111-4111-8111-000000000009', 'Trà đào cam sả', 'Trà đen với đào, cam và hương sả.', 35000, '/images/products/tra-dao.svg', 50, 1, true, 'Tea');
INSERT INTO public.products (product_id, product_name, description, base_price, image_url, stock, version, is_active, categories) VALUES ('c1111111-1111-4111-8111-000000000010', 'Trà vải hoa hồng', 'Trà thơm hương hoa hồng và vải ngâm.', 35000, '/images/products/tra-vai.svg', 50, 1, true, 'Tea');
INSERT INTO public.products (product_id, product_name, description, base_price, image_url, stock, version, is_active, categories) VALUES ('c1111111-1111-4111-8111-000000000011', 'Matcha đậu đỏ', 'Trà xanh matcha kết hợp sữa và đậu đỏ.', 39000, '/images/products/matcha.svg', 50, 1, true, 'Tea');
INSERT INTO public.products (product_id, product_name, description, base_price, image_url, stock, version, is_active, categories) VALUES ('c1111111-1111-4111-8111-000000000012', 'Trà sữa truyền thống', 'Trà đen và sữa, có thể thêm trân châu.', 32000, '/images/products/tra-sua.svg', 50, 1, true, 'Tea');
INSERT INTO public.products (product_id, product_name, description, base_price, image_url, stock, version, is_active, categories) VALUES ('c1111111-1111-4111-8111-000000000013', 'Trà xanh lài', 'Trà xanh ướp hương lài thanh nhẹ.', 25000, '/images/products/tra-xanh.svg', 50, 1, true, 'Tea');
INSERT INTO public.products (product_id, product_name, description, base_price, image_url, stock, version, is_active, categories) VALUES ('c1111111-1111-4111-8111-000000000014', 'Bánh Croissant', 'Bánh sừng bò bơ, một chiếc mỗi phần.', 29000, '/images/products/croissant.svg', 50, 1, true, 'Pastry & Dessert');
INSERT INTO public.products (product_id, product_name, description, base_price, image_url, stock, version, is_active, categories) VALUES ('c1111111-1111-4111-8111-000000000016', 'Bánh Mousse Chanh Dây', 'Bánh mousse chanh dây, một miếng mỗi phần.', 35000, '/images/products/mousse.svg', 50, 1, true, 'Pastry & Dessert');
INSERT INTO public.products (product_id, product_name, description, base_price, image_url, stock, version, is_active, categories) VALUES ('c1111111-1111-4111-8111-000000000007', 'Cold Brew', 'Cà phê ủ lạnh, hương vị thanh.', 35000, '/images/products/cold-brew.svg', 39, 2, true, 'Cold & Brewed');
INSERT INTO public.products (product_id, product_name, description, base_price, image_url, stock, version, is_active, categories) VALUES ('c1111111-1111-4111-8111-000000000015', 'Bánh Tiramisu', 'Bánh vị cà phê và cacao, một miếng mỗi phần.', 35000, '/images/products/tiramisu.svg', 50, 3, true, 'Pastry & Dessert');
INSERT INTO public.products (product_id, product_name, description, base_price, image_url, stock, version, is_active, categories) VALUES ('11111111-1111-4111-8111-111111111101', 'Trà sữa truyền thống', 'Trà sữa vị truyền thống thơm ngon đậm vị trà', 25000, 'https://example.com/images/ts-truyenthong.jpg', 100, 3, true, 'Tea');


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.order_items (orderitem_id, order_id, product_id, product_name, size, unit_price, quantity, line_total, note) VALUES ('b1b2c3d4-0001-4000-8000-000000000001', 'a1b2c3d4-0001-4000-8000-000000000001', '11111111-1111-4111-8111-111111111101', 'Trà sữa truyền thống', 'M', 30000, 1, 30000, NULL);
INSERT INTO public.order_items (orderitem_id, order_id, product_id, product_name, size, unit_price, quantity, line_total, note) VALUES ('b1b2c3d4-0002-4000-8000-000000000002', 'a1b2c3d4-0002-4000-8000-000000000002', '11111111-1111-4111-8111-111111111102', 'Trà sữa ô long', 'L', 38000, 2, 76000, NULL);
INSERT INTO public.order_items (orderitem_id, order_id, product_id, product_name, size, unit_price, quantity, line_total, note) VALUES ('e46e78e9-3716-4e15-ba71-31976cce724b', '5e58da94-a86a-416e-a050-a1e89f29cc6e', '11111111-1111-4111-8111-111111111101', 'Trà sữa truyền thống', 'M', 30000, 1, 35000, NULL);
INSERT INTO public.order_items (orderitem_id, order_id, product_id, product_name, size, unit_price, quantity, line_total, note) VALUES ('6c50389c-9eb3-4e43-88ef-53969efb04c7', '2364ef46-7a1f-49f1-88f8-2be881bc5706', '11111111-1111-4111-8111-111111111102', 'Trà sữa ô long', 'M', 33000, 2, 80000, NULL);
INSERT INTO public.order_items (orderitem_id, order_id, product_id, product_name, size, unit_price, quantity, line_total, note) VALUES ('e34ec7e0-e16f-4634-8e33-227434b4b6fc', '873b21ab-fb3c-41bd-8fdc-cfec8327bb79', '11111111-1111-4111-8111-111111111102', 'Trà sữa ô long', 'M', 33000, 1, 33000, NULL);
INSERT INTO public.order_items (orderitem_id, order_id, product_id, product_name, size, unit_price, quantity, line_total, note) VALUES ('c2de8327-6413-495f-bd28-dda085eac60a', '873b21ab-fb3c-41bd-8fdc-cfec8327bb79', '11111111-1111-4111-8111-111111111102', 'Trà sữa ô long', 'M', 33000, 6, 240000, NULL);
INSERT INTO public.order_items (orderitem_id, order_id, product_id, product_name, size, unit_price, quantity, line_total, note) VALUES ('468ae535-7695-4ea1-bcb7-8de96936801e', '3fa4edd9-7bd8-494f-a10e-0900facb2484', '11111111-1111-4111-8111-111111111101', 'Trà sữa truyền thống', 'S', 25000, 30, 750000, NULL);
INSERT INTO public.order_items (orderitem_id, order_id, product_id, product_name, size, unit_price, quantity, line_total, note) VALUES ('86e459e9-2c5d-40f9-b273-48de3f7893b1', '30ad68c2-361a-4d24-a175-20d70a23fb34', '11111111-1111-4111-8111-111111111102', 'Trà sữa ô long', 'S', 28000, 30, 1050000, NULL);
INSERT INTO public.order_items (orderitem_id, order_id, product_id, product_name, size, unit_price, quantity, line_total, note) VALUES ('1958432e-1b25-468e-b88c-acd352c167d8', '57a4b378-293c-4387-957d-81eb53655b52', '11111111-1111-4111-8111-111111111101', 'Trà sữa truyền thống', 'L', 35000, 34, 1564000, NULL);
INSERT INTO public.order_items (orderitem_id, order_id, product_id, product_name, size, unit_price, quantity, line_total, note) VALUES ('007e35e0-79a0-4712-bbfe-5cf3d9ae49f6', 'ee19e51f-30d2-4557-a02d-53f24c71b5ad', '11111111-1111-4111-8111-111111111101', 'Trà sữa truyền thống', 'M', 30000, 18, 648000, NULL);
INSERT INTO public.order_items (orderitem_id, order_id, product_id, product_name, size, unit_price, quantity, line_total, note) VALUES ('72637ada-6eae-4ad6-a5a8-e39321861b74', '77919099-6c9b-4a02-ba0a-c275952e1ded', 'c1111111-1111-4111-8111-000000000007', 'Cold Brew', 'M', 40000, 11, 440000, NULL);
INSERT INTO public.order_items (orderitem_id, order_id, product_id, product_name, size, unit_price, quantity, line_total, note) VALUES ('78c9493e-d29d-404d-8273-a5e516ffd9e5', '70e9843a-90d1-406b-bf53-8b9baabe3773', 'c1111111-1111-4111-8111-000000000015', 'Bánh Tiramisu', 'S', 35000, 4, 140000, NULL);
INSERT INTO public.order_items (orderitem_id, order_id, product_id, product_name, size, unit_price, quantity, line_total, note) VALUES ('b0870387-99a3-4473-83ad-50baeb6ddf4d', 'd7537331-ac2e-4aaf-8af9-ba300e5fc512', '11111111-1111-4111-8111-111111111101', 'Trà sữa truyền thống', 'M', 30000, 50, 1800000, NULL);


--
-- Data for Name: toppings; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.toppings (topping_id, topping_name, price, is_active) VALUES ('22222222-2222-4222-8222-222222222201', 'Trân châu đen', 5000, true);
INSERT INTO public.toppings (topping_id, topping_name, price, is_active) VALUES ('22222222-2222-4222-8222-222222222202', 'Trân châu trắng', 6000, true);
INSERT INTO public.toppings (topping_id, topping_name, price, is_active) VALUES ('22222222-2222-4222-8222-222222222203', 'Pudding trứng', 7000, true);
INSERT INTO public.toppings (topping_id, topping_name, price, is_active) VALUES ('22222222-2222-4222-8222-222222222204', 'Kem cheese', 10000, true);
INSERT INTO public.toppings (topping_id, topping_name, price, is_active) VALUES ('22222222-2222-4222-8222-222222222205', 'Thạch dừa', 5000, true);
INSERT INTO public.toppings (topping_id, topping_name, price, is_active) VALUES ('c2222222-2222-4222-8222-000000000001', 'Shot Espresso thêm', 10000, true);
INSERT INTO public.toppings (topping_id, topping_name, price, is_active) VALUES ('c2222222-2222-4222-8222-000000000002', 'Kem cheese', 8000, true);
INSERT INTO public.toppings (topping_id, topping_name, price, is_active) VALUES ('c2222222-2222-4222-8222-000000000003', 'Trân châu đen', 5000, true);
INSERT INTO public.toppings (topping_id, topping_name, price, is_active) VALUES ('c2222222-2222-4222-8222-000000000004', 'Thạch nha đam', 5000, true);
INSERT INTO public.toppings (topping_id, topping_name, price, is_active) VALUES ('c2222222-2222-4222-8222-000000000005', 'Đào miếng', 8000, true);
INSERT INTO public.toppings (topping_id, topping_name, price, is_active) VALUES ('c2222222-2222-4222-8222-000000000006', 'Vải ngâm', 8000, true);
INSERT INTO public.toppings (topping_id, topping_name, price, is_active) VALUES ('c2222222-2222-4222-8222-000000000007', 'Đậu đỏ', 6000, true);
INSERT INTO public.toppings (topping_id, topping_name, price, is_active) VALUES ('c2222222-2222-4222-8222-000000000008', 'Sốt caramel', 7000, true);


--
-- Data for Name: order_item_toppings; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.order_item_toppings (oit_id, orderitem_id, topping_id, topping_name, price) VALUES ('d1b2c3d4-0001-4000-8000-000000000001', 'b1b2c3d4-0001-4000-8000-000000000001', '22222222-2222-4222-8222-222222222201', 'Trân châu đen', 5000);
INSERT INTO public.order_item_toppings (oit_id, orderitem_id, topping_id, topping_name, price) VALUES ('d1b2c3d4-0002-4000-8000-000000000002', 'b1b2c3d4-0002-4000-8000-000000000002', '22222222-2222-4222-8222-222222222203', 'Pudding trứng', 7000);
INSERT INTO public.order_item_toppings (oit_id, orderitem_id, topping_id, topping_name, price) VALUES ('8416e096-28e7-4c6c-8d72-b55d94c9d616', 'e46e78e9-3716-4e15-ba71-31976cce724b', '22222222-2222-4222-8222-222222222201', 'Trân châu đen', 5000);
INSERT INTO public.order_item_toppings (oit_id, orderitem_id, topping_id, topping_name, price) VALUES ('aca41cd1-89e6-43db-bef7-8d177808e84d', '6c50389c-9eb3-4e43-88ef-53969efb04c7', '22222222-2222-4222-8222-222222222203', 'Pudding trứng', 7000);
INSERT INTO public.order_item_toppings (oit_id, orderitem_id, topping_id, topping_name, price) VALUES ('25e66db3-b48e-40e7-9517-05be42f95245', 'c2de8327-6413-495f-bd28-dda085eac60a', '22222222-2222-4222-8222-222222222203', 'Pudding trứng', 7000);
INSERT INTO public.order_item_toppings (oit_id, orderitem_id, topping_id, topping_name, price) VALUES ('34772337-cad6-47c6-bd0f-ea3173e85011', '86e459e9-2c5d-40f9-b273-48de3f7893b1', '22222222-2222-4222-8222-222222222203', 'Pudding trứng', 7000);
INSERT INTO public.order_item_toppings (oit_id, orderitem_id, topping_id, topping_name, price) VALUES ('6be6918c-f07a-43f2-b3ad-037467ae1a62', '1958432e-1b25-468e-b88c-acd352c167d8', '22222222-2222-4222-8222-222222222201', 'Trân châu đen', 5000);
INSERT INTO public.order_item_toppings (oit_id, orderitem_id, topping_id, topping_name, price) VALUES ('1014f8d2-9a39-422a-bf70-9cce84d23bc1', '1958432e-1b25-468e-b88c-acd352c167d8', '22222222-2222-4222-8222-222222222202', 'Trân châu trắng', 6000);
INSERT INTO public.order_item_toppings (oit_id, orderitem_id, topping_id, topping_name, price) VALUES ('e947bd74-74f7-44c8-99e4-59866a0fe272', '007e35e0-79a0-4712-bbfe-5cf3d9ae49f6', '22222222-2222-4222-8222-222222222202', 'Trân châu trắng', 6000);
INSERT INTO public.order_item_toppings (oit_id, orderitem_id, topping_id, topping_name, price) VALUES ('e0751764-2b98-454f-ad5a-0c6a42113947', 'b0870387-99a3-4473-83ad-50baeb6ddf4d', '22222222-2222-4222-8222-222222222202', 'Trân châu trắng', 6000);


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.payments (payment_id, order_id, idempotency_key, amount, method, status, transaction_id, paid_at, created_at, request_hash, provider, gateway_ref, payment_url, expires_at, bank_code, response_code) VALUES ('c1b2c3d4-0001-4000-8000-000000000001', 'a1b2c3d4-0001-4000-8000-000000000001', 'idem-key-001', 50000, 'cash', 'success', 'TXN-999001', '2026-10-01 01:16:00+00', '2026-10-22 10:28:38.755558+00', NULL, 'legacy', NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.payments (payment_id, order_id, idempotency_key, amount, method, status, transaction_id, paid_at, created_at, request_hash, provider, gateway_ref, payment_url, expires_at, bank_code, response_code) VALUES ('c1b2c3d4-0002-4000-8000-000000000002', 'a1b2c3d4-0002-4000-8000-000000000002', 'idem-key-002', 70000, 'momo', 'success', 'TXN-999002', '2026-10-01 02:31:00+00', '2026-10-22 10:28:38.755558+00', NULL, 'legacy', NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.payments (payment_id, order_id, idempotency_key, amount, method, status, transaction_id, paid_at, created_at, request_hash, provider, gateway_ref, payment_url, expires_at, bank_code, response_code) VALUES ('e3283399-3b82-4df2-9614-ef526b23da13', '5e58da94-a86a-416e-a050-a1e89f29cc6e', 'f2b8a739-a303-40a7-a3d7-4908e39421e1', 35000, 'momo', 'success', 'MOCK-500edd61-f6be-4078-a391-72d41d35b68f', '2026-10-27 18:37:30.257+00', '2026-10-27 18:37:30.264+00', NULL, 'legacy', NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.payments (payment_id, order_id, idempotency_key, amount, method, status, transaction_id, paid_at, created_at, request_hash, provider, gateway_ref, payment_url, expires_at, bank_code, response_code) VALUES ('4af44f17-e80c-49df-a0f8-e8f5f732f466', '2364ef46-7a1f-49f1-88f8-2be881bc5706', 'ce413278-9a8c-4bb4-b004-9ec1de2112c9', 80000, 'vnpay', 'success', 'MOCK-0fcb11a2-8916-485b-980b-5044a9083e26', '2026-10-28 06:00:04.744+00', '2026-10-28 06:00:04.748+00', NULL, 'legacy', NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.payments (payment_id, order_id, idempotency_key, amount, method, status, transaction_id, paid_at, created_at, request_hash, provider, gateway_ref, payment_url, expires_at, bank_code, response_code) VALUES ('9bd29cab-9df8-4cfb-a12b-da9253855ca6', '873b21ab-fb3c-41bd-8fdc-cfec8327bb79', '42f1ffda-a5a5-43e1-b028-b028bbb68c1e', 273000, 'vnpay', 'success', 'MOCK-dd2152d5-0b92-4637-a002-b216c79d952b', '2026-10-28 06:01:53.242+00', '2026-10-28 06:01:53.244+00', NULL, 'legacy', NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.payments (payment_id, order_id, idempotency_key, amount, method, status, transaction_id, paid_at, created_at, request_hash, provider, gateway_ref, payment_url, expires_at, bank_code, response_code) VALUES ('c25fce56-1859-4864-b37a-7e99bfdbca78', '3fa4edd9-7bd8-494f-a10e-0900facb2484', 'b298d4dc-bbfe-4c4f-89de-e51bc55514f5', 750000, 'vnpay', 'success', 'MOCK-a35aec2f-a86b-4a39-9dc5-efc1d7d526ed', '2026-10-28 07:17:36.825+00', '2026-10-28 07:17:36.828+00', NULL, 'legacy', NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.payments (payment_id, order_id, idempotency_key, amount, method, status, transaction_id, paid_at, created_at, request_hash, provider, gateway_ref, payment_url, expires_at, bank_code, response_code) VALUES ('80bca85b-a1c6-4940-a00e-9ab7ecc251a8', '30ad68c2-361a-4d24-a175-20d70a23fb34', '4e2037c5-6a51-419e-ab27-ee26f3d2de59', 1050000, 'vnpay', 'success', 'MOCK-b4a38eec-2177-439d-a98e-aeedb3a9f489', '2026-11-01 17:42:51.227+00', '2026-11-01 17:42:51.229+00', NULL, 'legacy', NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.payments (payment_id, order_id, idempotency_key, amount, method, status, transaction_id, paid_at, created_at, request_hash, provider, gateway_ref, payment_url, expires_at, bank_code, response_code) VALUES ('1db39c99-9db6-4faa-82f9-400ca64c6b67', '57a4b378-293c-4387-957d-81eb53655b52', 'f73ee93a-0b28-4183-8c3c-dd1cb4ffbf34', 1564000, 'vnpay', 'success', 'MOCK-5ef14044-2e7a-4f4a-9ba1-81deeac72faf', '2026-11-01 17:43:47.583+00', '2026-11-01 17:43:47.585+00', NULL, 'legacy', NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.payments (payment_id, order_id, idempotency_key, amount, method, status, transaction_id, paid_at, created_at, request_hash, provider, gateway_ref, payment_url, expires_at, bank_code, response_code) VALUES ('3713b669-7143-48b4-9103-0b6c030bcc6d', 'ee19e51f-30d2-4557-a02d-53f24c71b5ad', 'cd2c59ae-19dc-4463-a106-e449a26dc92f', 648000, 'vnpay', 'success', 'MOCK-467b593a-37d4-4f97-bdec-bee88d4c28a6', '2026-11-01 17:45:57.458+00', '2026-11-01 17:45:57.46+00', NULL, 'legacy', NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.payments (payment_id, order_id, idempotency_key, amount, method, status, transaction_id, paid_at, created_at, request_hash, provider, gateway_ref, payment_url, expires_at, bank_code, response_code) VALUES ('6104ff82-5184-4435-9cbb-6bc3cae9c535', '77919099-6c9b-4a02-ba0a-c275952e1ded', 'b3aabc88-1532-45d3-b350-9bdadd167031', 425000, 'momo', 'success', 'MOCK-82e4f279-f872-4e9c-ac6b-7e870d83dc43', '2026-11-02 09:28:54.071+00', '2026-11-02 09:28:54.071+00', '84276655b0f87d00e557a8e46281764363272f8c60058e9a09a1b77b8c4b451a', 'mock', NULL, NULL, '2026-11-02 09:48:53.934+00', NULL, '00');
INSERT INTO public.payments (payment_id, order_id, idempotency_key, amount, method, status, transaction_id, paid_at, created_at, request_hash, provider, gateway_ref, payment_url, expires_at, bank_code, response_code) VALUES ('5cf627bd-7f4a-47e7-b12a-56def24a19e1', '70e9843a-90d1-406b-bf53-8b9baabe3773', '208fdc1a-5394-40a8-9cc1-5d4f043559e3', 140000, 'banking', 'refunded', 'MOCK-d96e2e52-829b-4086-b373-5e3c24f00bb0', '2026-11-02 09:30:54.373+00', '2026-11-02 09:30:54.373+00', 'd19908aa5bac23be8b73c555bcb763aeadbc31e6b5e3fd45c30f8185e3887d75', 'mock', NULL, NULL, '2026-11-02 09:50:54.267+00', NULL, '00');
INSERT INTO public.payments (payment_id, order_id, idempotency_key, amount, method, status, transaction_id, paid_at, created_at, request_hash, provider, gateway_ref, payment_url, expires_at, bank_code, response_code) VALUES ('72f457d1-6648-4d59-af6c-c8a82848826d', 'd7537331-ac2e-4aaf-8af9-ba300e5fc512', '1c332cff-0b5e-4985-aa0d-7b5d552b3ea3', 1785000, 'momo', 'refunded', 'MOCK-fcbb1746-3e71-4bfd-81e2-1c8cacc08972', '2026-11-02 09:43:28.182+00', '2026-11-02 09:43:28.182+00', '16aa2653899034cc466deaef25678796e59531e3d353b236400fd32a78a53424', 'mock', NULL, NULL, '2026-11-02 10:03:28.056+00', NULL, '00');


--
-- Data for Name: product_size; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.product_size (size_id, product_id, size, add_price) VALUES ('2c18cb74-3276-40c4-82b2-8ba7e894e104', '11111111-1111-4111-8111-111111111101', 'S', 0.00);
INSERT INTO public.product_size (size_id, product_id, size, add_price) VALUES ('8cb0456a-b673-460f-a0c9-a6c2c9b1da73', '11111111-1111-4111-8111-111111111101', 'M', 5000.00);
INSERT INTO public.product_size (size_id, product_id, size, add_price) VALUES ('ddcdf6a9-3e12-48f4-a351-f461040c37d0', '11111111-1111-4111-8111-111111111101', 'L', 10000.00);
INSERT INTO public.product_size (size_id, product_id, size, add_price) VALUES ('b00d9e80-3ba3-423d-b783-54001faa5502', '11111111-1111-4111-8111-111111111102', 'S', 0.00);
INSERT INTO public.product_size (size_id, product_id, size, add_price) VALUES ('acc191e7-7156-4cd5-a01b-e708eff6bf89', '11111111-1111-4111-8111-111111111102', 'M', 5000.00);
INSERT INTO public.product_size (size_id, product_id, size, add_price) VALUES ('4268fc3b-164d-41c8-9215-ef4b7784e7c7', '11111111-1111-4111-8111-111111111102', 'L', 10000.00);
INSERT INTO public.product_size (size_id, product_id, size, add_price) VALUES ('b3aaba13-42b7-46da-98ad-50166722ff8a', 'c1111111-1111-4111-8111-000000000001', 'S', 0.00);
INSERT INTO public.product_size (size_id, product_id, size, add_price) VALUES ('095540a8-a401-4110-b2ed-724c78d13069', 'c1111111-1111-4111-8111-000000000001', 'M', 10000.00);
INSERT INTO public.product_size (size_id, product_id, size, add_price) VALUES ('c55038aa-35b5-4d3a-bc22-7b3e32b7c339', 'c1111111-1111-4111-8111-000000000002', 'S', 0.00);
INSERT INTO public.product_size (size_id, product_id, size, add_price) VALUES ('c7ad48d1-4e2c-4d4a-ba2c-7452489b000c', 'c1111111-1111-4111-8111-000000000002', 'M', 5000.00);
INSERT INTO public.product_size (size_id, product_id, size, add_price) VALUES ('5c91e47f-437f-4ae0-89bd-59725c044158', 'c1111111-1111-4111-8111-000000000002', 'L', 10000.00);
INSERT INTO public.product_size (size_id, product_id, size, add_price) VALUES ('c3aea217-2325-4d48-bf6e-1f0eefa68228', 'c1111111-1111-4111-8111-000000000003', 'S', 0.00);
INSERT INTO public.product_size (size_id, product_id, size, add_price) VALUES ('d9cc41ec-db6b-4842-b2bd-fcd63f1f93d4', 'c1111111-1111-4111-8111-000000000003', 'M', 5000.00);
INSERT INTO public.product_size (size_id, product_id, size, add_price) VALUES ('ccf55cb7-cf26-42e8-be25-338dbd99c13b', 'c1111111-1111-4111-8111-000000000003', 'L', 10000.00);
INSERT INTO public.product_size (size_id, product_id, size, add_price) VALUES ('7f0a714d-1ae3-4031-887d-a9ab78a954e6', 'c1111111-1111-4111-8111-000000000004', 'S', 0.00);
INSERT INTO public.product_size (size_id, product_id, size, add_price) VALUES ('c8c5e455-1a92-4561-a4f0-b1b73fb0993d', 'c1111111-1111-4111-8111-000000000004', 'M', 5000.00);
INSERT INTO public.product_size (size_id, product_id, size, add_price) VALUES ('4c54472a-0ef2-4933-b04f-08b2b7db4e6f', 'c1111111-1111-4111-8111-000000000004', 'L', 10000.00);
INSERT INTO public.product_size (size_id, product_id, size, add_price) VALUES ('40216fa7-f364-4922-b096-20951f6d21b1', 'c1111111-1111-4111-8111-000000000005', 'S', 0.00);
INSERT INTO public.product_size (size_id, product_id, size, add_price) VALUES ('fe7ebd8f-9917-4ec2-8a1e-a8ed93f4810c', 'c1111111-1111-4111-8111-000000000005', 'M', 5000.00);
INSERT INTO public.product_size (size_id, product_id, size, add_price) VALUES ('b8425d63-a403-4b59-b213-4b126365c8be', 'c1111111-1111-4111-8111-000000000005', 'L', 10000.00);
INSERT INTO public.product_size (size_id, product_id, size, add_price) VALUES ('294d5307-d5b6-4413-8799-060049426dab', 'c1111111-1111-4111-8111-000000000006', 'S', 0.00);
INSERT INTO public.product_size (size_id, product_id, size, add_price) VALUES ('e7fe7253-40cf-4b07-872e-caee74d36a37', 'c1111111-1111-4111-8111-000000000006', 'M', 5000.00);
INSERT INTO public.product_size (size_id, product_id, size, add_price) VALUES ('f2832531-2e77-4a64-9d06-d3f1f32f6475', 'c1111111-1111-4111-8111-000000000006', 'L', 10000.00);
INSERT INTO public.product_size (size_id, product_id, size, add_price) VALUES ('5601675c-38ec-4777-b4fb-05907e6734bd', 'c1111111-1111-4111-8111-000000000007', 'S', 0.00);
INSERT INTO public.product_size (size_id, product_id, size, add_price) VALUES ('20dac13f-9122-4635-8c20-32b14a566479', 'c1111111-1111-4111-8111-000000000007', 'M', 5000.00);
INSERT INTO public.product_size (size_id, product_id, size, add_price) VALUES ('a2bf1ca3-c24d-45a2-894f-63b41152d8ec', 'c1111111-1111-4111-8111-000000000007', 'L', 10000.00);
INSERT INTO public.product_size (size_id, product_id, size, add_price) VALUES ('c26f1fac-c904-462a-8b55-96559b9e38d2', 'c1111111-1111-4111-8111-000000000008', 'S', 0.00);
INSERT INTO public.product_size (size_id, product_id, size, add_price) VALUES ('0669be9e-25c1-4fc6-95bf-c57a08eb102d', 'c1111111-1111-4111-8111-000000000008', 'M', 5000.00);
INSERT INTO public.product_size (size_id, product_id, size, add_price) VALUES ('2d8ccc3d-4b25-4ae6-a133-0147cbb3cab7', 'c1111111-1111-4111-8111-000000000008', 'L', 10000.00);
INSERT INTO public.product_size (size_id, product_id, size, add_price) VALUES ('8cd7e878-2314-49c0-8c96-182b11885266', 'c1111111-1111-4111-8111-000000000009', 'S', 0.00);
INSERT INTO public.product_size (size_id, product_id, size, add_price) VALUES ('acac0060-197f-4c52-97ff-937fbaa451be', 'c1111111-1111-4111-8111-000000000009', 'M', 5000.00);
INSERT INTO public.product_size (size_id, product_id, size, add_price) VALUES ('cc49bfd9-8a69-4861-ab25-5a6556f3d6f3', 'c1111111-1111-4111-8111-000000000009', 'L', 10000.00);
INSERT INTO public.product_size (size_id, product_id, size, add_price) VALUES ('b1cdea48-9aaa-42ab-aa88-a1e42b425452', 'c1111111-1111-4111-8111-000000000010', 'S', 0.00);
INSERT INTO public.product_size (size_id, product_id, size, add_price) VALUES ('bd7c3234-0dcb-439f-bd40-64f7ccbb8e80', 'c1111111-1111-4111-8111-000000000010', 'M', 5000.00);
INSERT INTO public.product_size (size_id, product_id, size, add_price) VALUES ('b8516529-6ae2-4d64-97db-de76969bede7', 'c1111111-1111-4111-8111-000000000010', 'L', 10000.00);
INSERT INTO public.product_size (size_id, product_id, size, add_price) VALUES ('5e3156c0-cfbc-4e4e-993c-b8b9fd2d4df8', 'c1111111-1111-4111-8111-000000000011', 'S', 0.00);
INSERT INTO public.product_size (size_id, product_id, size, add_price) VALUES ('3b27aa74-0abe-423c-adbc-a8190dea8aed', 'c1111111-1111-4111-8111-000000000011', 'M', 7000.00);
INSERT INTO public.product_size (size_id, product_id, size, add_price) VALUES ('11df4e43-16ea-4c2e-ac14-012fb669d530', 'c1111111-1111-4111-8111-000000000011', 'L', 12000.00);
INSERT INTO public.product_size (size_id, product_id, size, add_price) VALUES ('36ee045d-3510-4f0c-acf5-1c074243e7a2', 'c1111111-1111-4111-8111-000000000012', 'S', 0.00);
INSERT INTO public.product_size (size_id, product_id, size, add_price) VALUES ('8c34dc3d-6977-4966-bf75-362029af1304', 'c1111111-1111-4111-8111-000000000012', 'M', 5000.00);
INSERT INTO public.product_size (size_id, product_id, size, add_price) VALUES ('8b6cd559-51e7-4180-b730-520504a2909e', 'c1111111-1111-4111-8111-000000000012', 'L', 10000.00);
INSERT INTO public.product_size (size_id, product_id, size, add_price) VALUES ('ad43fb48-f210-4e8c-b3cd-38abec6022e0', 'c1111111-1111-4111-8111-000000000013', 'S', 0.00);
INSERT INTO public.product_size (size_id, product_id, size, add_price) VALUES ('2219b2c4-9f50-45ef-b146-e5a7cc706108', 'c1111111-1111-4111-8111-000000000013', 'M', 5000.00);
INSERT INTO public.product_size (size_id, product_id, size, add_price) VALUES ('03792bb1-29a8-4756-93e7-e5cc5d32e1be', 'c1111111-1111-4111-8111-000000000013', 'L', 10000.00);
INSERT INTO public.product_size (size_id, product_id, size, add_price) VALUES ('2c037221-ff48-47c0-a95c-bd3bc853de4f', 'c1111111-1111-4111-8111-000000000014', 'S', 0.00);
INSERT INTO public.product_size (size_id, product_id, size, add_price) VALUES ('e531ea54-f28b-4835-b609-cb3c554a60d1', 'c1111111-1111-4111-8111-000000000015', 'S', 0.00);
INSERT INTO public.product_size (size_id, product_id, size, add_price) VALUES ('f239bb85-809e-4145-99dd-b4d50aaad115', 'c1111111-1111-4111-8111-000000000016', 'S', 0.00);


--
-- Data for Name: product_toppings; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.product_toppings (product_id, topping_id) VALUES ('11111111-1111-4111-8111-111111111101', '22222222-2222-4222-8222-222222222201');
INSERT INTO public.product_toppings (product_id, topping_id) VALUES ('11111111-1111-4111-8111-111111111101', '22222222-2222-4222-8222-222222222202');
INSERT INTO public.product_toppings (product_id, topping_id) VALUES ('11111111-1111-4111-8111-111111111102', '22222222-2222-4222-8222-222222222203');
INSERT INTO public.product_toppings (product_id, topping_id) VALUES ('11111111-1111-4111-8111-111111111106', '22222222-2222-4222-8222-222222222204');
INSERT INTO public.product_toppings (product_id, topping_id) VALUES ('c1111111-1111-4111-8111-000000000001', 'c2222222-2222-4222-8222-000000000001');
INSERT INTO public.product_toppings (product_id, topping_id) VALUES ('c1111111-1111-4111-8111-000000000001', 'c2222222-2222-4222-8222-000000000002');
INSERT INTO public.product_toppings (product_id, topping_id) VALUES ('c1111111-1111-4111-8111-000000000002', 'c2222222-2222-4222-8222-000000000001');
INSERT INTO public.product_toppings (product_id, topping_id) VALUES ('c1111111-1111-4111-8111-000000000003', 'c2222222-2222-4222-8222-000000000001');
INSERT INTO public.product_toppings (product_id, topping_id) VALUES ('c1111111-1111-4111-8111-000000000003', 'c2222222-2222-4222-8222-000000000002');
INSERT INTO public.product_toppings (product_id, topping_id) VALUES ('c1111111-1111-4111-8111-000000000003', 'c2222222-2222-4222-8222-000000000008');
INSERT INTO public.product_toppings (product_id, topping_id) VALUES ('c1111111-1111-4111-8111-000000000004', 'c2222222-2222-4222-8222-000000000001');
INSERT INTO public.product_toppings (product_id, topping_id) VALUES ('c1111111-1111-4111-8111-000000000004', 'c2222222-2222-4222-8222-000000000002');
INSERT INTO public.product_toppings (product_id, topping_id) VALUES ('c1111111-1111-4111-8111-000000000004', 'c2222222-2222-4222-8222-000000000008');
INSERT INTO public.product_toppings (product_id, topping_id) VALUES ('c1111111-1111-4111-8111-000000000005', 'c2222222-2222-4222-8222-000000000001');
INSERT INTO public.product_toppings (product_id, topping_id) VALUES ('c1111111-1111-4111-8111-000000000006', 'c2222222-2222-4222-8222-000000000001');
INSERT INTO public.product_toppings (product_id, topping_id) VALUES ('c1111111-1111-4111-8111-000000000006', 'c2222222-2222-4222-8222-000000000008');
INSERT INTO public.product_toppings (product_id, topping_id) VALUES ('c1111111-1111-4111-8111-000000000007', 'c2222222-2222-4222-8222-000000000001');
INSERT INTO public.product_toppings (product_id, topping_id) VALUES ('c1111111-1111-4111-8111-000000000008', 'c2222222-2222-4222-8222-000000000001');
INSERT INTO public.product_toppings (product_id, topping_id) VALUES ('c1111111-1111-4111-8111-000000000008', 'c2222222-2222-4222-8222-000000000008');
INSERT INTO public.product_toppings (product_id, topping_id) VALUES ('c1111111-1111-4111-8111-000000000009', 'c2222222-2222-4222-8222-000000000004');
INSERT INTO public.product_toppings (product_id, topping_id) VALUES ('c1111111-1111-4111-8111-000000000009', 'c2222222-2222-4222-8222-000000000005');
INSERT INTO public.product_toppings (product_id, topping_id) VALUES ('c1111111-1111-4111-8111-000000000010', 'c2222222-2222-4222-8222-000000000004');
INSERT INTO public.product_toppings (product_id, topping_id) VALUES ('c1111111-1111-4111-8111-000000000010', 'c2222222-2222-4222-8222-000000000006');
INSERT INTO public.product_toppings (product_id, topping_id) VALUES ('c1111111-1111-4111-8111-000000000011', 'c2222222-2222-4222-8222-000000000002');
INSERT INTO public.product_toppings (product_id, topping_id) VALUES ('c1111111-1111-4111-8111-000000000011', 'c2222222-2222-4222-8222-000000000003');
INSERT INTO public.product_toppings (product_id, topping_id) VALUES ('c1111111-1111-4111-8111-000000000011', 'c2222222-2222-4222-8222-000000000007');
INSERT INTO public.product_toppings (product_id, topping_id) VALUES ('c1111111-1111-4111-8111-000000000012', 'c2222222-2222-4222-8222-000000000002');
INSERT INTO public.product_toppings (product_id, topping_id) VALUES ('c1111111-1111-4111-8111-000000000012', 'c2222222-2222-4222-8222-000000000003');
INSERT INTO public.product_toppings (product_id, topping_id) VALUES ('c1111111-1111-4111-8111-000000000012', 'c2222222-2222-4222-8222-000000000004');
INSERT INTO public.product_toppings (product_id, topping_id) VALUES ('c1111111-1111-4111-8111-000000000013', 'c2222222-2222-4222-8222-000000000004');


--
-- PostgreSQL database dump complete
--

\unrestrict 0EWmCoJBsSm1yuhZFQmcPk41DR485Vc0Z7dql1QX2jOXJwmWqk7334h2Yywjj2g

