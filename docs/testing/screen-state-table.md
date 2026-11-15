# Bảng màn hình theo trạng thái đơn

Người phụ trách: Thành Long. Reviewer: Như (FE), Đức Long (nghiệp vụ).

Căn cứ (đối chiếu với `main` tại commit `0c76ad5`):
- Backend: `orders.service.ts` và `payments.service.ts` trên `main`. `orders.service.ts` giống hệt bản Assignment 1.
- Admin: `admin/page.tsx` trên `main`.
- Trang chi tiết đơn: `order-detail.tsx` của Assignment 1. **File này và `app/orders/[id]` chưa có trên `main`** (sẽ thêm trong D2), nên các cột mô tả `/orders/[id]` là hành vi của bản Assignment 1 sẽ đưa vào.
- Chưa đối chiếu: `order-list.tsx`, `order-status.tsx`, `lib/api/orders.ts` trên `main` (đã được sửa so với Assignment 1).

Cột **Hiện tại** mô tả đúng code nói trên. Cột **Mục tiêu D2** là việc cần làm theo kế hoạch 4 ngày, chưa có trong code.

Ba loại trạng thái được tách riêng. Không dùng một nhãn "thất bại" cho cả ba.

| Loại | Giá trị | Nguồn |
| --- | --- | --- |
| Order | `PENDING`, `PAID`, `PAYMENT_FAILED`, `PREPARING`, `READY`, `COMPLETED`, `CANCELLED` | `orders.service.ts` |
| Payment | `pending`, `success`, `failed`, `refunded` | `payments.service.ts` |
| Refund | Chưa có bảng hay trạng thái riêng. Hoàn mock chỉ đổi `payment.status` sang `refunded` | `orders.service.ts` `cancel()` |

## 1. Màn hình theo trạng thái

| # | Trạng thái | Khách thấy và làm được hiện tại (`/orders/[id]`) | Admin hiện tại (`/admin`) | Mục tiêu D2 (chưa có) |
| --- | --- | --- | --- | --- |
| 1 | `PENDING`, chưa có payment | Thanh tiến độ chưa sáng. Dòng "Đơn chưa được xác nhận thanh toán." Dòng thanh toán hiện `unpaid`. Nút **Tiếp tục thanh toán**, **Hủy đơn chưa trả tiền** | Thấy ở tab Order Tracking (lọc `pending`), trạng thái `unpaid`. Không có nút chuyển bước | Hiển thị hạn giữ hàng (`expires_at` đã có trong API) |
| 2 | `PAYMENT_FAILED` | Như dòng 1, dòng thanh toán hiện `<method> · failed`. **Tiếp tục thanh toán** gửi lại bằng phương thức cũ (banking hoặc momo) với khóa mới, cùng order | Thấy `payment_failed` và payment `failed`. Chỉ thấy lần thanh toán mới nhất | Đổi kênh ngay tại trang đơn. Gọi hàm đồng bộ checkout (hiện chỉ đơn `PAID` trở đi mới gọi `finishCheckout`). Hiện danh sách các lần thử |
| 3 | Payment `pending` (VNPay) | Thông báo "Đang chờ VNPay xác nhận...". Nút **Kiểm tra với VNPay** (reconcile). Nút Hủy bị khóa | Thấy payment `pending` | Hiển thị thời điểm kiểm tra gần nhất, giới hạn tần suất kiểm tra |
| 4 | `PAID`, chưa pha, mock hoặc free | Tiến độ sáng bước 1. Nút **Hủy đơn và hoàn thanh toán giả lập** | Nút **Start preparing** | Sau khi hủy, hiển thị receipt hoàn |
| 5 | `PAID`, VNPay | Không có nút hủy. Nếu gọi API trực tiếp, backend trả 409 "cần hoàn tiền xác nhận trước khi hủy" | Nút **Start preparing** | Hiển thị lý do không hủy được. Luồng "yêu cầu hoàn" nếu nhóm làm tích hợp refund |
| 6 | `PREPARING`, `READY`, `COMPLETED` | Thanh tiến độ sáng theo bước. Không có nút hủy. API hủy trả 409 "Chỉ hủy được đơn chưa bắt đầu pha chế" | **Start preparing**, **Mark ready**, **Complete** theo đúng chuỗi. Chuyển sai trả 409 | Không đổi |
| 7 | `CANCELLED`, chưa thu tiền | Hiện nhãn trạng thái. Lỗi giao diện: dòng "Đơn chưa được xác nhận thanh toán." vẫn hiện (vì chỉ xét `PAID` trở đi) | Thấy ở tab Order History (lọc `cancelled`) | Sửa thông điệp riêng cho đơn đã hủy. Nút **Đặt đơn thay thế** |
| 8 | `CANCELLED`, đã hoàn mock | Dòng thanh toán hiện `<method> · refunded`. Không có receipt | Thấy payment `refunded` | Receipt: số tiền hoàn, trạng thái, thời gian, lý do, nhãn "Mô phỏng". Admin phân biệt đơn cũ và đơn thay thế |

## 2. Dữ liệu API hiện có

`GET /orders/:id` trả đơn kèm **một payment mới nhất**: `payment_id`, `status`, `provider`, `method`, `payment_url`, `amount`, `transaction_id`, `paid_at`. Đơn có `expires_at`.

Chưa có: danh sách các lần thanh toán, receipt hoặc refund, các field `can_cancel`, `can_retry_payment`, `can_change_method`, lý do khóa thao tác. Đây là hợp đồng **đề xuất** (mục 4.2 file kế hoạch) và cần Triệu, Đức Long chốt trước khi FE dùng.

`POST /payments/:id/reconcile` đã có (chỉ cho payment VNPay đang `pending`). Các field `checked_at` và `next_check_at` là đề xuất thêm.

## 3. Mã lỗi theo code

| Tình huống | HTTP | Thông điệp trong code |
| --- | --- | --- |
| Chưa đăng nhập hoặc JWT hết hạn | 401 | FE chuyển đến `/signin?next=...` |
| Đơn không tồn tại hoặc không thuộc khách | 404 | "Không tìm thấy đơn hàng." |
| Hủy khi có payment đang pending | 409 | "Giao dịch đang chờ VNPay xác nhận. Chưa thể hủy đơn." |
| Hủy đơn PAID không phải mock, free, demo | 409 | "Giao dịch cổng thanh toán cần được hoàn tiền xác nhận trước khi hủy..." |
| Hủy đơn đã bắt đầu pha | 409 | "Chỉ hủy được đơn chưa bắt đầu pha chế." |
| Thu hồi điểm khi điểm không đủ | 409 | "Điểm thưởng cần đối soát trước khi hủy." |
| Thanh toán đơn hết hạn giữ hàng | 409 | "Đơn đã hết thời gian giữ hàng. Hãy tạo đơn mới." |
| Cùng Idempotency-Key, khác nội dung | 409 | "Idempotency-Key đã dùng cho yêu cầu khác." |
| Hết hàng khi báo giá hoặc tạo đơn | 400 | "Sản phẩm ... chỉ còn N phần trong kho..." |
| Tồn kho đổi trong lúc tạo đơn (version) | 409 | "Tồn kho vừa thay đổi. Hãy tải lại giỏ hàng." |

Hủy một đơn đã `CANCELLED` không lỗi: backend trả lại đơn như cũ (idempotent).

## 4. Quy tắc hiển thị cần giữ

1. Khi giao dịch cuối cùng chưa rõ, không báo thất bại và không bật thử lại hay đổi kênh.
2. Mock phải ghi rõ "Mô phỏng", không có chuyển tiền thật.
3. Đơn thay thế chỉ mở khi đơn cũ `CANCELLED` và khoản đã thu đã hoàn. FE sao chép cấu hình món vào giỏ và quote lại theo giá, tồn mới.
4. Không so sánh chuỗi lỗi tiếng Việt để quyết định hành vi. Nếu cần, đề nghị backend thêm mã lỗi ổn định.
5. Khách chỉ thấy đơn của mình. Đơn người khác trả 404.

## 5. Việc chờ chốt với nhóm

- Tên field của refund và `actions` (Triệu, Đức Long).
- Có làm "yêu cầu hủy đang xử lý" cho đơn có payment pending không. Hiện code chỉ trả 409.
- Sơ đồ liên quan: `Activity_Diagram` (luồng đặt hàng chính) và `activity-cancel` (hủy, hoàn mock, đặt đơn thay thế) trong `docs/diagrams/`.
