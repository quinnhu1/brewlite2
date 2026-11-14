## 1. Sơ đồ Use-Case (Use-Case Diagram)
[Sơ đồ Use-Case Đặt hàng và thanh toán không tiền mặt](../requirements/Usecase_Thanhtoan.svg)

## 2. Đặc tả Use-Case

| Thuộc tính              | Nội dung đặc tả 
|-------------------------|---------------------------------------------------------------------------------------
| **Use-case ID & Tên**   | `UC4.2` - Thanh toán không tiền mặt (Bao gồm `UC4.2.1` và `UC4.2.2`)
|-----------------------------------------------------------------------------------------------------------------
| **Mã yêu cầu liên kết** | `FR-06`, `FR-07`, `FR-08`, `FR-09`, `NFR-01`, `NFR-02`, `NFR-05` 
|-----------------------------------------------------------------------------------------------------------------
| **Actor**               | Khách hàng & Cổng thanh toán 
|-----------------------------------------------------------------------------------------------------------------
| **Trigger**             | Đơn hàng `PENDING` được tạo thành công từ `UC4.1` hoặc khách hàng nhấn "Xác nhận 
|                         |thanh toán" trên màn hình Thanh toán. 
|-----------------------------------------------------------------------------------------------------------------
| **Tiền điều kiện**      | 1. Khách hàng đã đăng nhập hợp lệ (JWT Token).
|                         | 2. Đã tồn tại đơn hàng ở trạng thái `PENDING` (hoặc `PAYMENT_FAILED` khi thử thanh 
|                         |toán lại). 
|-----------------------------------------------------------------------------------------------------------------
| **Luồng chính**         | 1. Hệ thống hiển thị thông tin tóm tắt đơn hàng và tổng số tiền cần thanh toán.
|                         | 2. Khách hàng lựa chọn một trong hai hình thức thanh toán:
|                         |  - `UC4.2.1`: Thanh toán qua ví điện tử (MoMo / VNPay).
|                         |  - `UC4.2.2`: Thanh toán bằng thẻ ngân hàng.
|                         | 3. Khách hàng nhấn **"Xác nhận trả"**; Client sinh mã định danh duy nhất 
|                         |`Idempotency-Key` và gọi API `POST /payments`.
|                         | 4. Hệ thống kiểm tra `Idempotency-Key` và gửi yêu cầu giao dịch sang 
|                         |`Payment Service`.
|                         | 5. `Payment Service` xử lý và trả về kết quả giao dịch thành công.
|                         | 6. Trong một Transaction, hệ thống lưu bản ghi `Payment`, trừ tồn kho sản phẩm chính 
|                         |thức (Optimistic Locking), chuyển trạng thái đơn từ `PENDING` > `PAID` và cộng điểm 
|                         |tích lũy (`LoyaltyTransaction`) cho khách hàng.
|                         | 7. Hệ thống điều hướng sang màn hình Xác nhận đặt hàng thành công hiển thị mã đơn 
|                         |(VD: `#1042`) và trạng thái `PAID`. 
|-----------------------------------------------------------------------------------------------------------------
| **Luồng thay thế**      | -A1 (Áp dụng mã giảm giá): Tại bước 1 hoặc bước 2, khách hàng chọn nhập mã ưu đãi (
|                         |`«extend»` sang `UC4.3 Áp dụng mã giảm giá`). Sau khi áp dụng thành công, hệ thống cập 
|                         |nhật số tiền thanh toán mới và tiếp tục bước 3.
|                         | -A2 (Gửi trùng yêu cầu thanh toán - Idempotency): Tại bước 4, nếu hệ thống nhận được 
|                         |request có trùng `Idempotency-Key` đã được xử lý trước đó, hệ thống trả về ngay kết  
|                         |quả giao dịch đã lưu mà không gọi lại cổng thanh toán hay trừ tiền lần 2. 
|-----------------------------------------------------------------------------------------------------------------
| **Luồng ngoại lệ**      | -E1 (Thanh toán thất bại): Tại bước 5, `Payment Service` từ chối giao dịch (số dư 
|                         |không đủ, thẻ lỗi) hệ thống chuyển trạng thái đơn sang `PAYMENT_FAILED`, giữ nguyên 
|                         |giỏ hàng/đơn hàng và hiển thị nút cho phép khách hàng thanh toán lại.
|                         | -E2 (Khách hàng hủy thanh toán): Khách hàng nhấn hủy giao dịch tại cổng thanh toán, 
|                         |đơn hàng chuyển sang `CANCELLED` (hoặc giữ `PENDING` tùy lựa chọn của khách).
|                         |-E3 (Cổng thanh toán mất kết nối): Hệ thống thông báo giao dịch đang chờ xác nhận, 
|                         |không cập nhật `PAID` cho đến khi nhận được phản hồi hợp lệ. 
|-----------------------------------------------------------------------------------------------------------------
| **Hậu điều kiện**       | -Thành công: Đơn hàng chuyển sang trạng thái `PAID`, tồn kho được trừ chính xác, điểm 
|                         |thưởng được cộng vào tài khoản khách hàng và hiển thị màn hình xác nhận đơn.
|                         |-Thất bại: Đơn hàng chuyển sang trạng thái `PAYMENT_FAILED`, không phát sinh giao dịch 
|                         |trừ tiền thành công. 

