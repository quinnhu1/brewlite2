# UC-01 — đặt và thanh toán đơn hàng

**Actor:** Customer; actor phụ VNPay/mock, nhân viên. **Trigger:** khách xác nhận checkout. **Liên kết:** FR-02–FR-06, FR-09, FR-11, FR-12, FR-14, NFR-01/03. **Tiền điều kiện:** giỏ không rỗng; đăng nhập trước khi gửi đơn; menu có dữ liệu. **Hậu điều kiện thành công:** một Order PAID, một Payment success, tồn đã tiêu thụ và điểm thưởng được ghi một lần. **Hậu điều kiện lỗi:** không mất giỏ; không thu hoặc cộng điểm chỉ theo thông báo frontend; giao dịch chưa rõ còn pending.

1. Khách chọn món, size, topping, quantity; UI tính tạm và cho sửa giỏ.
2. UI yêu cầu đăng nhập nếu chưa có JWT; API kiểm tra JWT và DTO cho mỗi request bảo vệ.
3. UI gửi `/orders/quote`, không gửi đơn giá; API báo giá từ DB. Quote không giữ stock.
4. UI tạo checkout key và lưu body/key. POST /orders trong transaction: khóa idempotency, đọc giá, promo và stock, cập nhật điều kiện stock/version, tạo Order và các snapshot Item/Topping. Commit toàn bộ hoặc rollback.
5. UI đối chiếu tổng quote và tổng Order; giá thay đổi yêu cầu khách xác nhận lại.
6. UI gửi POST /payments với key/body cố định cho thao tác đó. API khóa order, lấy total trong DB, từ chối nếu đang hủy/hết hạn/đã thu; trả pending hiện có nếu cùng kênh.
7. VNPay: tạo URL có hash theo QR/ATM/INTCARD hoặc chọn tại cổng; người dùng nhập dữ liệu tại VNPay. Mock: mô phỏng success/failed, gắn nhãn rõ.
8. IPN có chữ ký hoặc QueryDR đã xác minh quyết định trạng thái cuối; success ghi paid + EARN, failure ghi payment_failed. ReturnUrl không tự cập nhật thanh toán.
9. UI đọc lại trạng thái backend, giữ giỏ nếu failed; success hiển thị xác nhận và chuyển tracking. Worker tiếp tục khi tab đóng.

| Nhánh | Hành vi |
|---|---|
| A1 chưa login | Điều hướng signin với next; API trả 401 nếu client bỏ qua UI |
| A2 hết hàng/race | 400 khi đã thiếu trước update hoặc 409 do version đổi; rollback toàn bộ, không tạo payment |
| A3 thêm cost/total hoặc qty không hợp lệ | 400, không ghi order |
| A4 gửi lặp cùng key/body | Trả order/payment cũ; key dùng với nội dung khác → 409 |
| A5 thanh toán failed đã xác minh | Giữ order còn hạn, cho đổi kênh và key mới; giữ attempt cũ |
| A6 đóng tab/mất mạng/hết hạn URL | Không suy diễn ngân hàng thất bại; query theo lịch, chưa cho tạo charge mới |
| A7 callback giả/sai tiền | Không đổi tiền/tồn/điểm, phản hồi mã giao thức |
| A8 chưa rõ sau nhiều lần query | review_required; quản trị đối soát provider; không bịa PAID hoặc tự hoàn |

# UC-02 — hủy, hoàn toàn phần và đặt đơn thay thế

**Actor:** chủ đơn; hỗ trợ quản lý và gateway. **Trigger:** muốn hủy/đổi món. **Tiền điều kiện:** pending, payment_failed hoặc paid; chưa bắt đầu pha chế. **Liên kết:** FR-07/08/10/12/15.

1. Khách gửi lý do hủy; API khóa đúng order, kiểm tra owner và trạng thái.
2. Ghi `cancellation_requested_at` và lý do. Nhân viên không được bắt đầu pha chế sau điểm này.
3. Nếu không có khoản thu/pending: CANCELLED và hoàn stock đúng một lần.
4. Nếu payment còn pending: trả 200 là **đã nhận yêu cầu**, chưa phải **đã hủy xong**. Tiếp tục IPN/QueryDR.
5. Nếu xác nhận charge thành công: tạo một Refund cho một Payment. Mock hoàn mô phỏng trong cùng transaction. VNPay lưu request ID và submitted_at trước khi gọi API hoàn.
6. Nếu response hoàn chưa rõ/timeout: query-only, không gửi yêu cầu hoàn thứ hai. API response 00 chưa đủ khi transaction status còn 05/06; loại 01 là giao dịch thu gốc, không là bằng chứng hoàn.
7. Chỉ refund xác minh đúng merchant/ref/type02/amount/status00 mới cập nhật refunded, CANCELLED, đảo điểm và hoàn stock. Có receipt cho khách và quản trị.
8. Khi hủy/hoàn xong, nút chọn món thay thế lưu `replacement_of_order_id`; tạo đơn mới có mã/amount/payment riêng. Ví dụ thu 10k, hoàn 10k, thu mới 15k: quản lý thấy đủ ba biến động, chênh ròng 5k.

**Ngoại lệ:** đang PREPARING trở đi → 409. Merchant chưa bật refund → yêu cầu được ghi nhưng chưa gửi; hiển thị thông báo cấu hình. Hoàn bị từ chối → không ghi REFUNDED; admin xem mã và query theo lịch sau khi làm rõ với VNPay. Không cho đánh dấu hoàn bằng nút frontend hoặc sửa SQL. Quy tắc chỉ chặn **đơn thay thế của đơn cũ chưa hoàn xong**, không cấm khách mua một đơn độc lập khác.
