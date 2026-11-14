# Đặc tả Use Case Trọng tâm: Đặt hàng, Thanh toán Không tiền mặt & Thử lại (UC-01)

* **Mã tài liệu**: `docs/requirements/use-case-checkout.md`
* **Phụ trách**: Như & Thắng (Triệu duyệt quy tắc nghiệp vụ)
* **Liên kết Yêu cầu (SRS Traceability)**: `FR-03` (Xác thực JWT), `FR-04` (Tạo đơn & giữ kho), `FR-05` (Thanh toán không tiền mặt), `FR-06` (Đồng bộ giỏ hàng), `FR-09` (Khuyến mãi & Loyalty), `FR-10` (Hủy hoàn & Đổi món), `FR-12` (Đối soát VNPay Sandbox)
* **Liên kết Quy tắc Nghiệp vụ**: `BR-01` (Giá tính tại Server), `BR-02` (Giữ tồn kho bằng Transaction & Optimistic Locking `version`), `BR-03` (Idempotency chống tạo đơn/trừ tiền lặp), `BR-04` (Đồng bộ trạng thái Checkout & mở khóa kênh sau `FAILED`), `BR-05` (Hủy đơn, chứng từ `Refund` & đặt đơn thay thế)

## 1. Thông tin Chung (Overview)

| Thuộc tính | Nội dung chi tiết |
| :--- | :--- |
| **Mã Use Case** | `UC-01` |
| **Tên Use Case** | Đặt hàng, Thanh toán Không tiền mặt, Đối soát và Thử lại (Checkout & Cashless Payment Recovery) |
| **Tác nhân chính (Primary Actor)** | Khách hàng đã đăng nhập (`Customer`) |
| **Tác nhân phụ (Secondary Actors)** | Dịch vụ Thanh toán Mô phỏng (`Mock Payment Service` — Ví điện tử/Thẻ), Cổng thanh toán `VNPay Sandbox`, Nhân viên pha chế/Quản lý (`Barista / Admin`) |
| **Sự kiện kích hoạt (Trigger)** | Khách hàng chọn các món đồ uống trong giỏ hàng và nhấn nút **"Tiến hành Thanh toán"** trên giao diện web `Next.js` |
| **Điều kiện tiên quyết (Preconditions)** | 1. Khách hàng có ít nhất 1 sản phẩm được tích chọn trong giỏ hàng (`quantity` nguyên từ `1` đến `50`).<br>2. Khách hàng đã đăng nhập và có `JWT Access Token` hợp lệ. |
| **Điều kiện hoàn tất thành công (Success Postconditions)** | 1. Đơn hàng được lưu ở trạng thái `PAID` với giá snapshot chính xác từ Database.<br>2. Tồn kho `stock` được trừ đúng 1 lần và `version` tăng thêm `1`.<br>3. Bản ghi `Payment` chuyển sang `PAID`/`SUCCESS` (không thu lặp).<br>4. Điểm thưởng `Users.point` và `LoyaltyTransactions (EARN)` được cộng đúng 1 lần.<br>5. Giỏ hàng trên Frontend chỉ xóa các món đã thanh toán thành công, giữ lại các món chưa chọn mua. |
| **Đảm bảo tối thiểu khi lỗi / treo (Failure & Pending Guarantees)** | 1. Nếu thiếu tồn kho hoặc lỗi validate: Không có đơn dở dang, `stock` không âm, giỏ hàng giữ nguyên.<br>2. Nếu thanh toán xác nhận thất bại cuối cùng (`PAYMENT_FAILED`): Giữ nguyên `order_id`, Frontend tự động xóa `paymentBody` cũ, sinh `paymentKey` mới và mở khóa đổi phương thức (`can_change_method = true`).<br>3. Nếu giao dịch `VNPay` đang treo (`PENDING`): Không tạo giao dịch thu tiền cạnh tranh, không tự ý báo thành công hay hoàn tiền cho đến khi `IPN` hoặc `QueryDR` (`POST /payments/:id/reconcile`) xác nhận kết quả cuối. |

## 2. Luồng Sự kiện Chính (Main Success Scenario — Mock Ví/Thẻ)

1. **Kiểm tra giỏ hàng và yêu cầu báo giá**: Khách hàng mở trang Giỏ hàng (`/cart`), kiểm tra các món được chọn (Size `S/M/L`, `Topping`, ghi chú, hình thức nhận `AT_COUNTER`/`TAKEAWAY`) và mã khuyến mãi.
2. **Tính giá tại Backend (`POST /orders/quote`)**: Giao diện gửi `product_id`, `size`, `quantity`, `topping_ids`, `promo_code` lên API. Backend đọc `base_price`, `add_price`, giá topping và khuyến mãi từ `PostgreSQL` trả về `subtotal`, `discount`, `total` (`BR-01`).
3. **Khởi tạo yêu cầu đặt đơn (`POST /orders`)**: Frontend gửi `POST /orders` kèm `Authorization: Bearer <JWT>` và `Idempotency-Key: <checkoutKey>`.
4. **Kiểm tra dữ liệu và giữ tồn kho nguyên tử (`BR-02`, `BR-03`)**:
   * `ValidationPipe` (`whitelist=true`, `forbidNonWhitelisted=true`) từ chối mọi trường giá lạ (`cost`, `price`, `total`).
   * Mở Transaction, cộng dồn số lượng theo từng `product_id` và cập nhật có điều kiện `stock >= quantity` và khớp `version`.
   * Trừ `stock`, tăng `version + 1`, tạo `Order (status = PENDING)` và trả về `201 Created` kèm `actions`.
5. **Chọn phương thức và gửi yêu cầu thanh toán (`POST /payments`)**: Khách hàng chọn **Ví điện tử (`E_WALLET`)** hoặc **Thẻ (`CARD`)**, Frontend sinh `<paymentKey>` và gọi `POST /payments`.
6. **Xử lý thanh toán và khóa đơn nguyên tử**: Khi `SUCCESS`, khóa `Order` trong Transaction ngắn, cập nhật `Payment.status = PAID`, `Order.status = PAID`, cộng điểm `Users.point` và ghi `LoyaltyTransaction (EARN)`.
7. **Đồng bộ trạng thái Checkout trên Frontend (`syncCheckoutWithOrder`)**: Xóa các món đã mua (`removeSelectedItems`), xóa `checkoutKey`, `paymentKey`, `paymentBody` và hiển thị mã đơn `order_code`.

## 3. Các Luồng Nhánh và Ngoại lệ (Alternative & Exception Flows)

* **E1 — Client sửa JSON thêm giá giả (`cost`/`price`) hoặc sai `quantity` (`INT-PRICE-01`, `INT-QTY-01`)**: `ValidationPipe` trả về `400 Bad Request`, không tạo đơn. Nếu đổi `quantity: 3` hợp lệ với món giá DB `10.000đ` thì tính đúng `total = 30.000đ`.
* **E2 — Hai khách tranh mua món chỉ còn 2 ly (`INT-STOCK-01`, `INT-STOCK-02`)**: Transaction đầu thắng (`stock` về `0`); Transaction thứ hai `ROLLBACK` nhận `409 Conflict` / `400 Bad Request`. Frontend giữ giỏ, gọi `GET /products` cập nhật lại tồn kho và báo rõ món cần chỉnh.
* **E3 — Thanh toán thất bại cuối cùng & Đổi phương thức (`F04`, `F05`, `INT-PAY-03`, `E2E-RECOVERY-01`)**: Backend cập nhật `Order.status = PAYMENT_FAILED`, trả `can_change_method = true`. Hàm `syncCheckoutWithOrder` xóa `paymentBody` cũ, sinh `paymentKey` mới và mở khóa radio chọn Ví/Thẻ trên cùng `order_id`.
* **E4 — Giao dịch VNPay treo (`F01`, `F03`, `INT-PAY-04`)**: Giữ `can_change_method = false` và `paymentKey` cũ, hiển thị nút **"Kiểm tra trạng thái"** (`POST /payments/:id/reconcile` có cooldown `next_check_at`).
* **E5 — Hủy đơn, Chứng từ Hoàn tiền (`Refund`) & Đặt đơn thay thế (`FR-10`, `F02`, `F06`, `E2E-REFUND-01`)**: Đơn `PAID` qua Mock khi chưa `PREPARING` được hủy trong Transaction khóa đơn: tạo bản ghi `Refund`, chuyển `Payment.status = REFUNDED`, thu hồi điểm (`ADJUST`), hoàn `stock` 1 lần và chuyển `Order.status = CANCELLED`.
* **E6 — Đổi tài khoản trên cùng trình duyệt (`E2E-AUTH-01`)**: `ensureUserCheckoutSession(userId)` tự động xóa `activeOrderId`, `checkoutKey`, `paymentKey`, `paymentBody` khi đổi sang `userId` khác.
