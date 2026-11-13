-- BrewLite reviewed teammate dataset, 02/11/2026.
-- Catalog only by default: 10 products, 30 sizes, 20 toppings, 60 links, 20 fixed promotions.
-- ADD/UPDATE data; this is NOT a reset and never creates/changes tables.
-- Existing stock/version and user accounts are preserved on rerun.
-- Apply Prisma migrations first. Run with psql -v ON_ERROR_STOP=1 -f <this-file>.
-- Use either this catalog OR catalog.sql after a reset; importing both adds overlapping menu names.
-- Optional demo history needs the fixed checkout_integrity migration and a registered customer:
-- psql -c "SET brewlite.seed_demo_history='true';" -f <this-file>
BEGIN;
SELECT pg_advisory_xact_lock(hashtextextended('brewlite:teammate-seed',0));

-- ============================================================================
-- 1. THÊM 10 SẢN PHẨM MỚI (Nâng tổng số từ 10 lên 20 sản phẩm)
-- ============================================================================
INSERT INTO public.products (product_id, product_name, description, base_price, image_url, stock, version, is_active, categories)
VALUES
  ('11111111-1111-4111-8111-111111111111', 'Trà đào cam sả', 'Trà đào thanh mát kết hợp cam vàng và sả tươi', 35000, '/images/products/tra-dao.svg', 90, 1, true, 'Tea'),
  ('11111111-1111-4111-8111-111111111112', 'Trà vải hoa hồng', 'Trà đen ủ hương hoa hồng kèm trái vải ngâm giòn ngọt', 38000, '/images/products/tra-vai.svg', 75, 1, true, 'Tea'),
  ('11111111-1111-4111-8111-111111111113', 'Cà phê sữa đá', 'Cà phê phin truyền thống kết hợp sữa đặc béo ngậy', 29000, '/images/products/ca-phe-sua.svg', 150, 1, true, 'Classic Coffee'),
  ('11111111-1111-4111-8111-111111111114', 'Bạc xỉu', 'Nhiều sữa ít cà phê, hương vị ngọt dịu dễ uống', 29000, '/images/products/bac-xiu.svg', 120, 1, true, 'Classic Coffee'),
  ('11111111-1111-4111-8111-111111111115', 'Caramel Macchiato', 'Espresso kết hợp sữa tươi và sốt caramel thơm lừng', 45000, '/images/products/latte.svg', 60, 1, true, 'Cold & Brewed'),
  ('11111111-1111-4111-8111-111111111116', 'Sữa tươi trân châu đường đen', 'Sữa tươi thanh trùng cùng trân châu nấu đường đen Hàn Quốc', 35000, '/images/products/tra-sua.svg', 85, 1, true, 'Tea'),
  ('11111111-1111-4111-8111-111111111117', 'Trà xanh đậu đỏ', 'Trà xanh Nhật Bản kết hợp đậu đỏ hầm mềm bùi', 32000, '/images/products/tra-xanh.svg', 50, 1, true, 'Tea'),
  ('11111111-1111-4111-8111-111111111118', 'Bánh Tiramisu', 'Bánh ngọt vị cà phê cacao truyền thống kiểu Ý', 35000, '/images/products/tiramisu.svg', 40, 1, true, 'Pastry & Dessert'),
  ('11111111-1111-4111-8111-111111111119', 'Bánh Mousse Chanh Dây', 'Bánh mousse chua ngọt thanh mát giải nhiệt', 32000, '/images/products/mousse.svg', 45, 1, true, 'Pastry & Dessert'),
  ('11111111-1111-4111-8111-111111111120', 'Cold Brew Sữa Tươi', 'Cà phê ủ lạnh 16 tiếng phối cùng sữa tươi không đường', 42000, '/images/products/cold-brew-milk.svg', 65, 1, true, 'Cold & Brewed')
ON CONFLICT (product_id) DO UPDATE SET
 product_name=EXCLUDED.product_name, description=EXCLUDED.description,
 base_price=EXCLUDED.base_price, image_url=EXCLUDED.image_url,
 is_active=EXCLUDED.is_active, categories=EXCLUDED.categories;

-- ============================================================================
-- 2. THÊM 3 SIZE (S, M, L) CHO 10 SẢN PHẨM MỚI (Tổng: 30 dòng)
-- ============================================================================
INSERT INTO public.product_size (product_id, size, add_price)
SELECT p.product_id, s.size, s.add_price
FROM (
  VALUES 
    ('11111111-1111-4111-8111-111111111111'::uuid),
    ('11111111-1111-4111-8111-111111111112'::uuid),
    ('11111111-1111-4111-8111-111111111113'::uuid),
    ('11111111-1111-4111-8111-111111111114'::uuid),
    ('11111111-1111-4111-8111-111111111115'::uuid),
    ('11111111-1111-4111-8111-111111111116'::uuid),
    ('11111111-1111-4111-8111-111111111117'::uuid),
    ('11111111-1111-4111-8111-111111111118'::uuid),
    ('11111111-1111-4111-8111-111111111119'::uuid),
    ('11111111-1111-4111-8111-111111111120'::uuid)
) AS p(product_id)
CROSS JOIN (
  VALUES 
    ('S', 0.00),
    ('M', 5000.00),
    ('L', 10000.00)
) AS s(size, add_price)
ON CONFLICT (product_id, size) DO UPDATE SET add_price=EXCLUDED.add_price;

-- ============================================================================
-- 3. THÊM 20 TOPPINGS VÀ 60 DÒNG PRODUCT_TOPPINGS (6 topping / 1 sản phẩm mới)
-- ============================================================================
INSERT INTO public.toppings (topping_id, topping_name, price, is_active)
VALUES
  ('22222222-2222-4222-8222-222222222201', 'Trân châu đen', 5000, true),
  ('22222222-2222-4222-8222-222222222202', 'Trân châu trắng', 5000, true),
  ('22222222-2222-4222-8222-222222222203', 'Trân châu hoàng kim', 6000, true),
  ('22222222-2222-4222-8222-222222222204', 'Thạch dừa', 5000, true),
  ('22222222-2222-4222-8222-222222222205', 'Thạch nha đam', 6000, true),
  ('22222222-2222-4222-8222-222222222206', 'Thạch sương sáo', 5000, true),
  ('22222222-2222-4222-8222-222222222207', 'Pudding trứng', 7000, true),
  ('22222222-2222-4222-8222-222222222208', 'Pudding socola', 7000, true),
  ('22222222-2222-4222-8222-222222222209', 'Kem cheese (Macchiato)', 10000, true),
  ('22222222-2222-4222-8222-222222222210', 'Kem trứng nướng', 12000, true),
  ('22222222-2222-4222-8222-222222222211', 'Đậu đỏ ngâm', 7000, true),
  ('22222222-2222-4222-8222-222222222212', 'Hạt sen', 8000, true),
  ('22222222-2222-4222-8222-222222222213', 'Đào miếng', 8000, true),
  ('22222222-2222-4222-8222-222222222214', 'Trái vải ngâm', 8000, true),
  ('22222222-2222-4222-8222-222222222215', 'Khúc bạch phô mai', 8000, true),
  ('22222222-2222-4222-8222-222222222216', 'Thạch củ năng', 6000, true),
  ('22222222-2222-4222-8222-222222222217', 'Thạch cà phê', 5000, true),
  ('22222222-2222-4222-8222-222222222218', 'Shot Espresso thêm', 10000, true),
  ('22222222-2222-4222-8222-222222222219', 'Bánh Flan', 8000, true),
  ('22222222-2222-4222-8222-222222222220', 'Hạt chia', 4000, true)
ON CONFLICT (topping_id) DO UPDATE SET
 topping_name=EXCLUDED.topping_name, price=EXCLUDED.price, is_active=EXCLUDED.is_active;

INSERT INTO public.product_toppings (product_id, topping_id)
SELECT p.product_id, t.topping_id
FROM (
  VALUES 
    ('11111111-1111-4111-8111-111111111111'::uuid),
    ('11111111-1111-4111-8111-111111111112'::uuid),
    ('11111111-1111-4111-8111-111111111113'::uuid),
    ('11111111-1111-4111-8111-111111111114'::uuid),
    ('11111111-1111-4111-8111-111111111115'::uuid),
    ('11111111-1111-4111-8111-111111111116'::uuid),
    ('11111111-1111-4111-8111-111111111117'::uuid),
    ('11111111-1111-4111-8111-111111111118'::uuid),
    ('11111111-1111-4111-8111-111111111119'::uuid),
    ('11111111-1111-4111-8111-111111111120'::uuid)
) AS p(product_id)
CROSS JOIN (
  VALUES 
    ('22222222-2222-4222-8222-222222222201'::uuid),
    ('22222222-2222-4222-8222-222222222202'::uuid),
    ('22222222-2222-4222-8222-222222222204'::uuid),
    ('22222222-2222-4222-8222-222222222207'::uuid),
    ('22222222-2222-4222-8222-222222222209'::uuid),
    ('22222222-2222-4222-8222-222222222210'::uuid)
) AS t(topping_id)
ON CONFLICT (product_id, topping_id) DO NOTHING;


-- Explicit FIXED discounts, never infer the enum order.
INSERT INTO public.promotions
 (promotion_id,code,promotion_name,discount_type,discount_value,min_amount,max_discount,start_at,end_at,is_active)
SELECT
 ('44444444-4444-4444-8444-4444444444'||lpad(i::text,2,'0'))::uuid,
 'PROMO2026_'||lpad(i::text,2,'0'), 'Ưu đãi demo giảm 10.000đ đợt '||i,
 'fixed'::public.discount_type_enum,10000,50000,10000,
 now()-interval '5 days',now()+interval '30 days',true
FROM generate_series(1,20) i
ON CONFLICT(code) DO UPDATE SET
 promotion_name=EXCLUDED.promotion_name, discount_type=EXCLUDED.discount_type,
 discount_value=EXCLUDED.discount_value,min_amount=EXCLUDED.min_amount,
 max_discount=EXCLUDED.max_discount,start_at=EXCLUDED.start_at,end_at=EXCLUDED.end_at,is_active=true;

-- Optional history. These are clearly marked DEMO records, never actual gateway charges.
-- All 20 orders are COMPLETED, with one SUCCESS payment and one EARN entry per order.
-- Money, loyalty and stock are calculated together. Rerunning does not grant/debit them twice.
DO $$
DECLARE
 i int; uid uuid; oid uuid; iid uuid; tid uuid; pid uuid;
 uids uuid[]; p record; t record; sz text;
 qty int; unit_amount numeric; sub_amount numeric; discount_amount numeric; total_amount numeric; earned int;
 created_time timestamptz;
BEGIN
 IF current_setting('brewlite.seed_demo_history',true) IS DISTINCT FROM 'true' THEN
  RAISE NOTICE 'Catalog loaded. No users/orders/payments/loyalty were created. See README for optional demo history.';
  RETURN;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payments' AND column_name='provider') THEN
  RAISE EXCEPTION 'Optional history requires checkout_integrity migration. Run prisma migrate deploy first.';
 END IF;
 SELECT array_agg(user_id ORDER BY user_id) INTO uids FROM public.users
 WHERE role='customer' AND password LIKE '$2%';
 IF coalesce(array_length(uids,1),0)=0 THEN
  RAISE EXCEPTION 'Register a customer through /auth/register before loading optional demo history. No changes committed.';
 END IF;
 FOR i IN 1..20 LOOP
  uid := uids[1+((i-1)%array_length(uids,1))];
  oid := ('55555555-5555-4555-8555-5555555555'||lpad(i::text,2,'0'))::uuid;
  iid := ('66666666-6666-4666-8666-6666666666'||lpad(i::text,2,'0'))::uuid;
  IF EXISTS(SELECT 1 FROM public.orders WHERE order_id=oid) THEN
   IF NOT EXISTS(SELECT 1 FROM public.orders WHERE order_id=oid AND order_code='DEMO-BL-2026-'||lpad(i::text,3,'0')) THEN
    RAISE EXCEPTION 'Old demo order ID % already exists with different content. Back up and reset demo data before importing history.',oid;
   END IF;
   CONTINUE;
  END IF;
  SELECT * INTO STRICT p FROM public.products
  WHERE product_id=('11111111-1111-4111-8111-1111111111'||(11+((i-1)%10))::text)::uuid;
  sz := (ARRAY['S','M','L'])[1+((i-1)%3)];
  SELECT p.base_price+s.add_price INTO STRICT unit_amount
  FROM public.product_size s WHERE s.product_id=p.product_id AND s.size=sz;
  SELECT tt.* INTO STRICT t FROM public.toppings tt JOIN public.product_toppings pt USING(topping_id)
  WHERE pt.product_id=p.product_id AND tt.is_active ORDER BY tt.topping_id LIMIT 1;
  qty := 1+((i-1)%2);
  sub_amount := (unit_amount+t.price)*qty;
  discount_amount := CASE WHEN sub_amount>=50000 THEN 10000 ELSE 0 END;
  total_amount := sub_amount-discount_amount;
  SELECT promotion_id INTO STRICT pid FROM public.promotions WHERE code='PROMO2026_'||lpad(i::text,2,'0');
  IF discount_amount=0 THEN pid:=NULL; END IF;
  created_time := now()-make_interval(hours=>i);
  UPDATE public.products SET stock=stock-qty,version=version+1 WHERE product_id=p.product_id AND stock>=qty;
  IF NOT FOUND THEN RAISE EXCEPTION 'Insufficient stock for demo history: %. No changes committed.',p.product_name; END IF;
  INSERT INTO public.orders(order_id,order_code,user_id,promotion_id,status,subtotal,discount,total,pickup_method,customer_name,customer_phone,stock_reserved,created)
  SELECT oid,'DEMO-BL-2026-'||lpad(i::text,3,'0'),uid,pid,'completed',sub_amount,discount_amount,total_amount,'AT_COUNTER',u.name,u.phone,false,created_time
  FROM public.users u WHERE u.user_id=uid;
  INSERT INTO public.order_items(orderitem_id,order_id,product_id,product_name,size,unit_price,quantity,line_total)
  VALUES(iid,oid,p.product_id,p.product_name,sz,unit_amount,qty,sub_amount);
  INSERT INTO public.order_item_toppings(oit_id,orderitem_id,topping_id,topping_name,price)
  VALUES(('77777777-7777-4777-8777-7777777777'||lpad(i::text,2,'0'))::uuid,iid,t.topping_id,t.topping_name,t.price);
  INSERT INTO public.payments(payment_id,order_id,idempotency_key,amount,method,status,transaction_id,paid_at,created_at,provider)
  VALUES(('88888888-8888-4888-8888-8888888888'||lpad(i::text,2,'0'))::uuid,oid,'demo-seed-2026-'||lpad(i::text,3,'0'),total_amount,'banking','success','DEMO-TXN-2026-'||lpad(i::text,3,'0'),created_time,created_time,'demo');
  earned := floor(total_amount/10000)::int;
  INSERT INTO public.loyalty_transactions(loyalty_id,user_id,order_id,loyalty_point,type,description,created_at)
  VALUES(('99999999-9999-4999-8999-9999999999'||lpad(i::text,2,'0'))::uuid,uid,oid,earned,'EARN','[DEMO] Tích điểm '||'DEMO-BL-2026-'||lpad(i::text,3,'0'),created_time);
  UPDATE public.users SET point=point+earned WHERE user_id=uid;
 END LOOP;
END $$;
COMMIT;
