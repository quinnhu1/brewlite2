# Mô hình miền (domain model)

Người phụ trách: Đức Long. Nguồn sự thật là `app/api/prisma/schema.prisma` và các migration trong `app/api/prisma/migrations/`. Tài liệu này mô tả các lớp miền, thuộc tính chính, quan hệ và các bất biến (invariant) mà code cùng database cùng bảo vệ. ERD hoặc bảng dữ liệu chỉ là phụ trợ, không thay cho sơ đồ lớp này.

- Sơ đồ lớp: [`diagrams/domain-class.puml`](../diagrams/domain-class.puml) (nguồn PlantUML), [`diagrams/domain-class.dot`](../diagrams/domain-class.dot) (nguồn Graphviz dùng để xuất), bản xuất [`diagrams/Domain_Class_Diagram.svg`](../diagrams/Domain_Class_Diagram.svg).
- Tên lớp dùng tiếng Anh dạng số ít; tên bảng trong ngoặc là tên thật trong PostgreSQL.

## 1. Bảy lớp bắt buộc và lớp bổ sung

| Lớp (bảng) | Vai trò | Thuộc tính chính |
| --- | --- | --- |
| **User** (`users`) | Khách, nhân viên, quản lý | `user_id`, `name`, `phone` (unique), `email` (unique không phân biệt hoa thường), `password` (bcrypt), `point`, `role ∈ {customer, staff, admin}` |
| **Product** (`products`) | Món trong menu | `productId`, `productName`, `basePrice`, `stock ≥ 0`, `version` (khóa lạc quan), `isActive`, `categories` |
| **Order** (`orders`) | Một lần đặt hàng | `order_id`, `order_code` (unique), `status`, `subtotal`, `discount`, `total`, `checkout_key` (unique), `request_hash`, `stock_reserved`, `expires_at`, thông tin nhận hàng |
| **OrderItem** (`order_items`) | Một dòng món đã chốt giá | `product_id`, `product_name` (bản chụp), `size`, `unit_price`, `quantity > 0`, `line_total`, `note` |
| **Payment** (`payments`) | Một lần thử thanh toán | `payment_id`, `idempotency_key` (unique), `request_hash`, `amount`, `method`, `status`, `provider ∈ {mock, vnpay, free, legacy}`, `transaction_id` (unique), `gateway_ref` (unique), `payment_url`, `expires_at`, `response_code`, `paid_at` |
| **Promotion** (`promotions`) | Mã giảm giá | `code` (unique), `discount_type ∈ {percentage, fixed}`, `discount_value`, `min_amount`, `max_discount`, `start_at`, `end_at`, `is_active` |
| **LoyaltyTransaction** (`loyalty_transactions`) | Biến động điểm | `user_id`, `order_id?`, `loyalty_point`, `type ∈ {EARN, REDEEM, EXPIRE, ADJUST}`, `description`, `created_at` |
| **Refund** (`refunds`) — *bổ sung D2* | Chứng từ hoàn tiền toàn phần | `refund_id`, `payment_id` (unique), `order_id`, `idempotency_key` (unique), `request_hash`, `amount ≥ 0`, `status ∈ {pending, succeeded, failed}`, `provider`, `reason`, `requested_by`, `requested_at`, `completed_at`, `provider_ref` (unique) |

Lớp phụ trợ (có trong sơ đồ, không thuộc bảy lớp bắt buộc): **ProductSize** (`product_size`: phụ thu theo size, unique `(product_id, size)`), **Topping** (`toppings`), **OrderItemTopping** (`order_item_toppings`: bản chụp tên và giá topping lúc đặt).

## 2. Quan hệ và bội số

| Quan hệ | Bội số | Ghi chú |
| --- | --- | --- |
| User — Order | 1 — 0..* | Mỗi đơn thuộc đúng một người dùng (lấy từ JWT, không lấy từ body). |
| Order — OrderItem | 1 — 1..* (hợp thành) | Xóa đơn thì xóa dòng (`ON DELETE CASCADE`). Một đơn có ít nhất một dòng (DTO `ArrayMinSize(1)`). |
| OrderItem — Product | 0..* — 1 | Dòng giữ bản chụp tên và giá; đổi giá món sau này không đổi đơn cũ. |
| OrderItem — OrderItemTopping — Topping | 1 — 0..* — 1 | Topping phải nằm trong danh sách được phép của món. |
| Product — ProductSize | 1 — 1..3 | Đồ uống có S/M/L, bánh có một size. |
| Order — Payment | 1 — 0..* | Nhiều lần thử (thất bại rồi thử lại). Tối đa **một** payment `pending` và **một** payment `success` mỗi đơn (partial unique index). |
| Payment — Refund | 1 — 0..1 | Phạm vi đợt này: mỗi payment tối đa một lần hoàn toàn phần (`refunds.payment_id` unique). |
| Order — Refund | 1 — 0..* | Thực tế 0..1 vì một đơn chỉ có một payment thành công. |
| User — Refund (requested_by) | 1 — 0..* | Ghi lại ai yêu cầu hoàn. |
| Promotion — Order | 0..1 — 0..* | Đơn áp tối đa một mã. |
| User — LoyaltyTransaction | 1 — 0..* | |
| Order — LoyaltyTransaction | 0..1 — 0..* | Tối đa một `EARN` mỗi đơn (partial unique index). Hoàn tiền sinh một `ADJUST` âm. |

## 3. Trạng thái

**Order.status**: `pending → paid → preparing → ready → completed`; `pending ⇄ payment_failed`; `pending | payment_failed | paid → cancelled`. Mọi chuyển trạng thái đi qua `assertTransition` (`app/api/src/orders/order-state.ts`), sai chuỗi trả 409. Enum trong DB còn các giá trị cũ (`confirmed`, `processing`, `shipping`, `delivering`) được giữ để không phá dữ liệu cũ, code mới không dùng.

**Payment.status**: `pending → success | failed`; `success → refunded` (chỉ khi có Refund `succeeded`).

**Refund.status**: mock/free tạo thẳng `succeeded` trong cùng transaction hủy đơn. Cổng thật (khi làm sau) phải tạo `pending`, gọi cổng ngoài transaction, rồi xác nhận `succeeded`/`failed` bằng transaction khác; không ghi `refunded` trước khi có xác nhận.

## 4. Bất biến (invariant)

| Mã | Bất biến | Nơi bảo vệ |
| --- | --- | --- |
| INV-01 | `total = subtotal − discount`, `0 ≤ discount ≤ subtotal` | Service tính giá từ DB; CHECK `orders_amount_consistent` |
| INV-02 | Giá không bao giờ lấy từ client | DTO không có trường giá; `forbidNonWhitelisted` trả 400 |
| INV-03 | `stock ≥ 0`, không bán quá tồn khi tranh mua | `updateMany ... stock >= qty AND version = v`; CHECK `products_stock_nonnegative` |
| INV-04 | Cùng `checkout_key` chỉ tạo một đơn; khác nội dung/người dùng thì 409 | Advisory lock + unique `orders.checkout_key` + `request_hash` |
| INV-05 | Một đơn không bị thu tiền hai lần | Unique `payments_one_success_per_order`, `payments_one_pending_per_order`, unique `idempotency_key` |
| INV-06 | Điểm chỉ cộng một lần, sau khi thanh toán thành công | Unique `loyalty_one_earn_per_order` |
| INV-07 | Mỗi payment tối đa một chứng từ hoàn; hoàn kho/điểm đúng một lần | Unique `refunds.payment_id`; khóa dòng đơn (`FOR UPDATE`) bao toàn bộ hủy + hoàn; cờ `stock_reserved` |
| INV-08 | Số tiền hoàn ≥ 0 và bằng số đã thu (hoàn toàn phần) | CHECK `refunds_amount_nonnegative`; service lấy `amount` từ payment |
| INV-09 | Refund `succeeded` phải có `completed_at` | CHECK `refunds_completed_when_succeeded` |
| INV-10 | Khách chỉ xem đơn/chứng từ của mình | Truy vấn luôn lọc theo `user_id` từ JWT; người khác nhận 404 |

## 5. Thay đổi so với `class diagram.puml` cũ

`class diagram.puml` là bản thiết kế ban đầu (enum khái niệm như `E_WALLET`, `INITIATED`). `domain-class.*` bám đúng tên và giá trị đang chạy trong code/DB, có thêm Refund, ProductSize, Topping, OrderItemTopping và các ràng buộc unique. Khi trình bày, dùng `domain-class` làm bản chính.
