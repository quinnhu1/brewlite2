# SRS rút gọn — yêu cầu và tiêu chí chấp nhận

Version đề xuất: 1.3, ngày cập nhật 14/11/2026. SRS mô tả hành vi mục tiêu của bản sửa; kết quả chạy thực tế nằm trong `docs/release/TEST-RESULTS.md`. Must = bắt buộc; Should = cần làm để hoàn thiện; Could = mở rộng; Won't = ngoài bản này.

| ID | Ưu tiên | User story / yêu cầu | Tiêu chí chấp nhận |
|---|---|---|---|
| FR-01 | Must | US-01: xem menu | GET /products chỉ trả món hoạt động; có loading/empty/error; tìm kiếm/lọc nhóm trên UI |
| FR-02 | Must | US-02: chọn size/topping | Size thuộc món; topping được phép; số lượng nguyên 1–50; món bánh chỉ size cấu hình |
| FR-03 | Must | US-03: xác thực | Đăng ký không tự cấp admin; email unique không phân biệt hoa thường; mật khẩu hash; đổi mật khẩu cần mật khẩu hiện tại và thu hồi JWT cũ; đăng xuất mọi phiên; giới hạn thử ở DB |
| FR-04 | Must | US-04: giỏ hàng | Thêm, xóa, đổi số lượng; giữ giỏ cùng user sau refresh; dọn giỏ/checkout khi đổi tài khoản; bỏ response phiên cũ; backend báo giá chính thức |
| FR-05 | Must | UC-01: tạo đơn | Cấm giá/total do client tự thêm; giá DB + size + topping × quantity; promo server; lưu snapshot giá; kiểm tra tồn kho trong transaction |
| FR-06 | Must | UC-01: thanh toán | Payment lấy amount từ Order; khóa mỗi order; một pending/success; cùng key/body chỉ có một lần xử lý |
| FR-07 | Must | US-07: xem lịch sử/tracking | Khách chỉ đọc đơn mình; có payment_attempts, refund, lý do hủy; refresh không làm mất đơn |
| FR-08 | Must | US-08: pha chế | Staff/admin chuyển đúng chuỗi trạng thái; chỉ PAID chưa yêu cầu hủy mới được PREPARING |
| FR-09 | Must | US-09: đổi kênh sau thất bại | FAILED đã xác minh mở lại QR/ATM/thẻ; key mới cho lần thử mới; PENDING chưa rõ không tạo khoản thu thứ hai |
| FR-10 | Must | UC-02: hủy/hoàn/đổi món | Chưa thu: hủy, trả tồn một lần. Đã thu: refund receipt; chỉ hoàn được xác minh mới CANCELLED; thu hồi điểm và trả tồn một lần |
| FR-11 | Must | US-11: chống bán vượt tồn | Hai user cùng đặt 2 khi còn 2: đúng một đơn được tạo, tồn bằng 0, đơn thua không có payment |
| FR-12 | Must | US-12: callback/đối soát | ReturnUrl chỉ điều hướng; IPN/QueryDR xác minh hash, merchant, ref, amount, loại và trạng thái trước khi ghi DB |
| FR-13 | Should | US-13: quản trị | Admin CRUD sản phẩm với version; xem tất cả đơn và chứng từ; gọi đối soát; customer không truy cập admin |
| FR-14 | Must | US-14: khuyến mãi/loyalty | Promo hợp lệ theo điều kiện; chỉ EARN khi paid; refund đảo EARN đúng một lần; không tự cộng điểm khi ReturnUrl báo success |
| FR-15 | Should | US-15: tự phục hồi | Worker chạy 30s, QueryDR mỗi payment ít nhất 5 phút giữa hai claim; lưu lịch xuống DB; cảnh báo review_required |
| FR-16 | Could | US-16: PWA offline | Không triển khai offline checkout; không được hiển thị thành công khi chưa có backend xác nhận |
| FR-17 | Won't | Đổi món bằng bù tiền trên đơn đã thu | Dùng hủy + hoàn + đơn mới có replacement_of_order_id; không sửa amount lịch sử |
| NFR-01 | Must | Bảo mật nghiệp vụ | Test sửa cost, access chéo user, self-admin, IPN giả, amount sai đều không tạo biến động tiền/tồn sai |
| NFR-02 | Must | Hiệu năng | Mục tiêu API phản hồi <500ms trên dữ liệu mẫu theo đề. Benchmark 12 nhóm API, 690 mẫu, ghi p50/p95/max, mức đồng thời và mọi mẫu vượt ngưỡng. Đo lại trên VPS; ghi riêng độ trễ gateway. Không thu hẹp yêu cầu thành chỉ GET /products hoặc chỉ p95 |
| NFR-03 | Must | Nhất quán/khả dụng | Health kiểm tra DB; restart container; khóa DB dùng được với nhiều process; worker phục hồi từ trạng thái DB |
| NFR-04 | Must | Khả năng triển khai | Compose local đủ 3 dịch vụ; production HTTPS, DB không publish; migration riêng; image SHA; smoke và rollback |
| NFR-05 | Must | Khả năng kiểm thử | Unit + PostgreSQL integration + ít nhất một browser E2E; CI bắt lỗi và chặn merge bằng ruleset GitHub |
| NFR-06 | Should | Khả năng dùng | Màn mobile 390px, form có nhãn/lỗi; đang xử lý khóa nút; trạng thái chưa rõ có thông báo và thời điểm kiểm tra tiếp |
| NFR-07 | Must | Quan sát và truy vết | Mã order/payment/refund/request, lịch sử giao dịch; release ghi SHA, migration, kết quả test; không log secret/OTP |

Sơ đồ use-case tổng quát: `../diagrams/use-cases.puml` và `.svg`. Không đánh dấu yêu cầu đã đạt chỉ dựa trên việc có file; đối chiếu `TEST-RESULTS.md` và chứng cứ public trước khi nộp.
