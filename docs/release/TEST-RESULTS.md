# Kết quả kiểm tra bản sửa — baseline lịch sử

> **Phạm vi lịch sử:** số liệu dưới đây là snapshot của ZIP `BrewLite-payment-server-fixed` trước khi ghép hardening mật khẩu và test mới. Chúng không chứng minh bản repo hiện tại đã pass. Sau khi thay đổi, phải chạy lại `npm run check`, `npm run test:integration`, `npm run test:e2e` trên DB/browser test tương ứng và ghi log mới; Sandbox VNPay/AWS vẫn cần xác minh riêng.

Ngày bàn giao tài liệu: 14/11/2026 (Việt Nam), bản 1.3. Phạm vi: mã trong gói BrewLite-payment-server-fixed; dữ liệu kiểm tra là DB tạm, không là VPS hay merchant thật.

| Kiểm tra | Kết quả quan sát |
|---|---|
| Lint API và web | PASS, không còn lỗi/cảnh báo source trong lượt check cuối |
| Unit Jest | 8/8 pass, 3 suites |
| Client store và API response | 8/8 pass: đổi tài khoản, xóa phiên, migration giỏ cũ, response token cũ kể cả khi đọc body chậm |
| NestJS build | PASS |
| Next.js build và TypeScript | PASS, 13 routes/pages trong output build |
| Migration trên PostgreSQL 16.15 mới | PASS, 6 migrations; chạy lại không có migration pending |
| Bootstrap catalog/admin | PASS: 21 sản phẩm, một admin riêng, không có demo user; chặn seed ghi đè/duplicate admin |
| Integration HTTP + PostgreSQL thật | **64/64 pass**, 2 suites; khoảng 23,4 giây |
| So sánh Prisma schema với DB sau migration | Empty migration, không có drift Prisma phát hiện |
| 12 nhóm API, 690 samples local | Tất cả mẫu <500 ms; max **76,68 ms** ở register; payment/refund dùng mock, chưa đo mạng gateway/public |
| Production Compose | `docker compose config --quiet` qua với CLI 2.39.4 và env mẫu kiểm tra |
| Shell scripts | bash -n qua; Node bootstrap scripts syntax qua |
| 7 bộ PlantUML nguồn/SVG | Render qua; đã xem layout các sơ đồ chính |
| 6 Playwright browser scenarios | **Chưa pass**: Chromium hệ thống bị chặn ở launch, `socket() failed: Operation not permitted`; chưa chạy đến thao tác UI. Lần dùng runtime mặc định cũng thiếu browser binary |
| Docker image build/runtime trên VPS | **Chưa chạy**: môi trường sửa không có Docker daemon/VPS access |
| VNPay QR/ATM/refund thật trên Sandbox merchant | **Chưa chạy**: ZIP không có merchant credentials; response gateway trong integration là test fixture có chữ ký |
| Public HTTPS/CD/reboot/restore trên AWS | **Chưa chạy**; cần nhóm làm theo deployment.md |

Các test nghiệp vụ kiểm tra giá giả, hai khách tranh 2 ly, QR→ATM sau failed, hủy pending→IPN failed/success, hoàn một lần dưới cạnh tranh, amount/hash sai, status 05/06, phân biệt thu type 01/hoàn type 02, timeout không resend, cooldown QueryDR và quyền admin đối soát. Bản 1.3 thêm lỗi secret/ngày giao dịch trước gửi rồi phục hồi, receipt đã claim sau restart chỉ query, mật khẩu hiện tại, thu hồi phiên, đổi mật khẩu đồng thời và rate limit dùng DB. Không ghi test mock là xác nhận chuyển tiền ngân hàng.

Logs chọn lọc trong `evidence/`: check.txt, integration.txt, performance.json, schema-diff.sql, browser-environment.txt và setup.txt. Không đóng gói trace/screenshot trình duyệt hay secret. Bài browser phải chạy lại trên máy nhóm/GitHub có Chromium; CI vẫn giữ bước này, không bỏ/skip để lấy dấu xanh giả.

Chạy lại: `npm run check`; chuẩn bị DB *_test theo tests/README.md rồi `npm run test:integration`, `npm run test:e2e`. Các test browser vẫn là bước bắt buộc trong CI. Không bỏ bước hoặc đổi thành skip để tạo kết quả xanh.

Hiệu năng: 6 nhóm read/quote có 100 mẫu và mức đồng thời 5; register/login mỗi nhóm 5 mẫu tuần tự; tạo đơn/payment/detail/cancel mỗi nhóm 20 mẫu tuần tự. Các lượt warm-up read/quote không tính vào 690 mẫu. Giá trị p95 cao nhất theo nhóm là 76,68 ms (register có ít mẫu); đây không phải p95 gộp của toàn hệ thống. Script trả exit code lỗi nếu có bất kỳ mẫu đo nào >=500 ms.

Mặc định script chỉ đọc API; phép đo có ghi phải bật PERF_ALLOW_WRITES, dùng API loopback, DB *_test riêng và provider mock. Không chạy bài ghi trên DB nhóm/production. Kết quả 12 nhóm không bao phủ mọi endpoint/admin/callback, cold start hoặc tải cao. NFR <500 ms vẫn cần đo lại trên VPS và ghi riêng độ trễ VNPay; không chứng minh SLA từ số local.
