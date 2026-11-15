# Test catalogue nghiệm thu BrewLite

Người lập: Thành Long. Dựa trên mục 9.2 của file kế hoạch 4 ngày.

> Các mã test dưới đây là **danh mục cần có trong hồ sơ**, không khẳng định mọi test đã tồn tại trong repo. Sau khi triển khai, điền tên test và file thật vào cột Evidence. Với test đồng thời, ghi cả HTTP response, số order và payment, stock và loyalty sau giao dịch. Chỉ thấy hai tab báo khác nhau là chưa đủ.

Đối chiếu với `main` tại commit `0c76ad5`. Backend đã có sẵn bộ test trong `app/api/test/` (`checkout.e2e-spec.ts`, `auth.e2e-spec.ts`, `app.e2e-spec.ts`) và `app/api/src/**/*.spec.ts`. Nhiều dòng INT-* bên dưới có thể đã được các test này bao phủ. Chưa đối chiếu từng dòng, nên cột Evidence còn trống. Chưa có test Playwright (`tests/e2e`) trên `main`.

Điều kiện chạy các test mock: `PAYMENT_PROVIDER=mock` và `PAYMENT_MOCK_ALLOW_OVERRIDE=true` (để chọn kết quả `FAILED`). Test cổng VNPay chạy riêng với Sandbox.

Cột Expected của nhóm INT-CANCEL, INT-REFUND, INT-STOCK, INT-IDEM, INT-PAY đã đối chiếu với `orders.service.ts` và `payments.service.ts`. Các dòng còn lại lấy từ file kế hoạch, chưa kiểm với code.

Dữ liệu mẫu cho nhóm INT-PRICE: món giá bán 10.000, size S phụ thu 0, không topping, tồn ít nhất 3. Dùng UUID thật của món đó.

Trạng thái: ☐ chưa chạy, ☑ đạt, ☒ lỗi.

## 1. API và tích hợp

| ID | Tình huống | Input hoặc các bước | Kết quả bắt buộc | Owner | Evidence | TT |
| --- | --- | --- | --- | --- | --- | --- |
| API-MENU-01 | Menu và chi tiết với DB seed | `GET /products`, `GET /products/:id` với ID đúng và ID sai | Đúng món active, size và topping. ID sai trả lỗi rõ | Đức Long | | ☐ |
| INT-PRICE-01 | Gửi `cost` hoặc `price` trong items | `POST /orders` có thêm trường giá trong body | 400. Số đơn và tồn không đổi | Đức Long | | ☐ |
| INT-PRICE-02 | Giá DB 10K, quantity 3 | `POST /orders` với `quantity=3` | Tổng 30K nếu không phụ thu và khuyến mãi | Đức Long | | ☐ |
| INT-QTY-01 | Quantity không hợp lệ | `quantity` bằng 0, -1, 1.5, 51 | 400, không ghi đơn | Đức Long | | ☐ |
| INT-STOCK-01 | Hai user tranh hai ly | Món stock=2, hai user cùng `POST /orders` mua 2 | Một đơn được tạo, tồn về 0. Request còn lại bị từ chối: 400 nếu thấy thiếu hàng lúc đọc, 409 nếu version đổi lúc ghi | Triệu, Đức Long | | ☐ |
| INT-STOCK-02 | Cùng món ở hai size vượt tồn | Một đơn có hai dòng cùng món, size khác nhau, tổng vượt tồn | Không lọt qua bằng cách tách dòng | Đức Long | | ☐ |
| INT-IDEM-01 | Tạo đơn lặp cùng khóa | Hai `POST /orders` cùng key và body | Cùng `order_id` được trả lại, kho chỉ giữ một lần | Đức Long | | ☐ |
| INT-IDEM-02 | Cùng khóa, đổi body hoặc user | Gửi lại key cũ với body khác, hoặc user khác | 409 "Idempotency-Key đã được dùng cho nội dung khác", không dùng lại dữ liệu của người khác | Đức Long | | ☐ |
| INT-PAY-01 | Thanh toán lặp cùng khóa | Hai `POST /payments` cùng key | Cùng một payment được trả lại, một lần thu, một EARN | Triệu | | ☐ |
| INT-PAY-02 | Hai khóa khác nhau cùng order | Hai `POST /payments` khác key, cùng order | Không có hai lần thu thành công. Khi đã `PAID`, lần sau trả 409 "Đơn không còn ở trạng thái chờ thanh toán" | Triệu | | ☐ |
| INT-PAY-03 | FAILED rồi trả lại bằng khóa mới | Thất bại rồi gửi lại với key mới | Cùng order, payment mới, đơn về `PENDING` rồi `PAID`. Điểm chỉ cộng sau thành công. Cần `simulate_result=FAILED` ở lần đầu | Triệu | | ☐ |
| INT-PAY-04 | Timeout hoặc callback đáng ngờ | (VNPay Sandbox) `vnp_TransactionStatus` khác `00` và `02`, hoặc `vnp_ResponseCode` = `07`, hoặc timeout | IPN trả `99 Pending reconciliation`, payment vẫn `pending`, không báo đã trả. Chỉ `00`+`00` là thành công, chỉ trạng thái `02` (mã khác `00`, `07`) là thất bại cuối. Không áp dụng cho mock | Triệu | | ☐ |
| INT-IPN-01 | Chữ ký sai, amount sai, callback lặp | Gửi IPN sai chữ ký, sai số tiền, gửi hai lần | Từ chối dữ liệu sai. Lặp không cộng tiền hay điểm lần hai | Triệu | | ☐ |
| INT-CANCEL-01 | Hủy đơn chưa trả hai lần | Hủy `PENDING` hai lần liên tiếp | Lần hai trả lại đơn đã `CANCELLED`, không lỗi. Hoàn kho một lần, không có payment `refunded` | Đức Long | | ☐ |
| INT-REFUND-01 | Hủy đơn PAID mock đồng thời | Hai yêu cầu hủy cùng lúc | Payment `refunded` một lần, một hoàn kho, một dòng ADJUST. Yêu cầu thứ hai trả đơn đã `CANCELLED`. Receipt riêng là D2, chưa có bảng | Đức Long | | ☐ |
| INT-REFUND-02 | Hủy khi đã pha hoặc user khác hủy | Hủy đơn `PREPARING`. User khác hủy đơn của người khác | `PREPARING`: 409 "Chỉ hủy được đơn chưa bắt đầu pha chế". User khác: 404. Đơn và tiền không đổi | Đức Long | | ☐ |
| INT-CANCEL-02 | Hủy khi có giao dịch cổng *(bổ sung)* | Hủy đơn có payment `pending` (VNPay). Hủy đơn `PAID` bằng VNPay | Cả hai trả 409, đơn và tồn không đổi | Đức Long | | ☐ |
| INT-CANCEL-03 | Thu hồi điểm khi điểm không đủ *(bổ sung)* | Hủy đơn `PAID` mock sau khi khách đã dùng hết điểm | 409 "Điểm thưởng cần đối soát trước khi hủy", toàn bộ transaction rollback | Đức Long | | ☐ |
| INT-EXPIRE-01 | Đơn hết hạn giữ hàng *(bổ sung)* | Đơn `PENDING` quá 20 phút, không có payment pending. Chạy `expireUnpaidOrders()` | Đơn `CANCELLED`, tồn hoàn một lần. Đơn có payment pending thì không bị hủy | Đức Long | | ☐ |
| INT-EXPIRE-02 | Thanh toán đơn đã hết hạn *(bổ sung)* | `POST /payments` cho đơn quá `expires_at` | 409 "Đơn đã hết thời gian giữ hàng. Hãy tạo đơn mới." | Triệu | | ☐ |
| INT-STATE-01 | Nhảy trạng thái sai | `PAID` chuyển thẳng `COMPLETED` | 409. Đúng chuỗi mới thành công | Triệu | | ☐ |
| INT-PROMO-01 | Mã khuyến mãi | Mã sai, hết hạn, chưa đủ minimum. Mã hợp lệ | Báo lỗi đúng. Mã hợp lệ giảm đúng và tổng không âm | Đức Long | | ☐ |

Các dòng INT-CANCEL-02, INT-CANCEL-03, INT-EXPIRE-01 và INT-EXPIRE-02 *(bổ sung)* được suy ra từ hành vi thật trong `orders.service.ts` và `payments.service.ts`, không có trong bảng 9.2 gốc.

E2E-REFUND-01 cần phần receipt và đặt đơn thay thế của D2. Trước D2, test này chỉ kiểm được đơn cũ `CANCELLED` với payment `refunded` và đơn mới.

## 2. Giao diện và E2E (Playwright)

| ID | Tình huống | Các bước | Kết quả bắt buộc | Owner | Evidence | TT |
| --- | --- | --- | --- | --- | --- | --- |
| E2E-CHECKOUT-01 | Menu tới mock fail rồi retry success | Chọn món, thanh toán mock `FAILED`, thử lại `SUCCESS` | Giữ giỏ lúc fail, một đơn duy nhất, xóa phần đã mua sau success | Thành Long | | ☐ |
| E2E-RECOVERY-01 | Về tracking rồi quay lại giỏ sau FAILED | Sau `FAILED`, mở trang theo dõi rồi quay về giỏ | Mở được đổi kênh, không kẹt `paymentBody` cũ | Thắng | | ☐ |
| E2E-REFUND-01 | Hủy PAID mock rồi đặt ly 15K | Hủy đơn 10K đã thanh toán mock, đặt đơn 15K | Hiện receipt đơn cũ và đơn mới. Quản lý xem được cả hai | Thành Long | | ☐ |
| E2E-AUTH-01 | Đổi user trên cùng trình duyệt | Đăng xuất, đăng nhập user khác | Không trả đơn hoặc checkout của user trước | Như, Thắng | | ☐ |
| E2E-CANCEL-01 | Hủy đơn chưa trả *(bổ sung)* | Tạo đơn `PENDING`, bấm Hủy | Đơn `CANCELLED`, tồn hoàn một lần, không có receipt tiền | Thành Long | | ☐ |
| E2E-CANCEL-02 | Khóa hủy sau khi pha *(bổ sung)* | Admin chuyển đơn sang `PREPARING`, khách thử hủy | Nút hủy bị khóa kèm lý do. API trả 409 nếu gọi trực tiếp | Thành Long | | ☐ |
| E2E-HISTORY-01 | Lịch sử không lộ đơn khác *(bổ sung)* | Khách B mở URL đơn của khách A | 404. Lịch sử B không có đơn của A | Thành Long | | ☐ |
| E2E-MOBILE-01 | Một luồng trên mobile *(bổ sung)* | Chạy E2E-CHECKOUT-01 với viewport 390 px | Không tràn ngang, nút dùng được. Có thêm một luồng desktop | Thành Long | | ☐ |

Các test đánh dấu *(bổ sung)* lấy từ danh sách việc D3 của Thành Long (success, fail/retry đổi kênh, cancel unpaid, cancel paid mock, khóa hủy sau preparing, lịch sử không lộ đơn khác). Chúng không nằm trong bảng 9.2 gốc.

## 3. Phi chức năng và vận hành

| ID | Tình huống | Các bước | Kết quả bắt buộc | Owner | Evidence | TT |
| --- | --- | --- | --- | --- | --- | --- |
| NFR-PERF-01 | Đo hiệu năng API | Đo `GET /products` theo tập dữ liệu đã ghi (mẫu: 20 lượt, p95) | Báo cáo thời gian và số lần vượt 500 ms | Thiện | | ☐ |
| OPS-01 | Clone sạch | Clone repo, migrate, seed, Compose theo README | Làm theo README chạy được | Như | | ☐ |
| OPS-02 | HTTPS ngoài mạng, laptop tắt | Mở web, API, `/health` từ mạng ngoài (4G) khi laptop nhóm tắt | Web, API và health hoạt động | Thành Long | | ☐ |
| OPS-03 | Deploy mới, smoke fail, rollback | Deploy bản lỗi, smoke đỏ, rollback theo runbook | Pipeline đỏ, khôi phục app theo runbook | Thiện | | ☐ |
| OPS-04 | Backup rồi restore thử | Backup DB, restore vào DB thử | Dữ liệu khôi phục kiểm tra được | Thiện, Đức Long | | ☐ |

## 4. Cách điền Evidence

Mỗi dòng cần một trong các dạng sau, đủ để người ngoài nhóm kiểm lại:
- Tên test và đường dẫn file, kèm link CI chạy xanh.
- Với test đồng thời: HTTP response, số order, số payment, stock và loyalty trước và sau.
- Với E2E: báo cáo Playwright và trace khi lỗi, ảnh hoặc video có mã đơn và thời điểm, che JWT.
- Với OPS: ảnh chụp từ mạng ngoài, commit hoặc tag, URL.

Không hardcode kết quả provider hoặc dùng ảnh thay cho dữ liệu thật.
