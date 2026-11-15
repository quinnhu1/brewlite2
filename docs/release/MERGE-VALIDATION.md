# Trạng thái xác minh sau lần ghép

Ngày ghi nhận: 15/11/2026 (Asia/Ho_Chi_Minh). Phạm vi: cây mã tạo từ `BrewLite-payment-server-fixed.zip`, ghép có chọn lọc các phần đã đối chiếu từ `brewlite2.zip`.

## Đã thực hiện

- `node --check` thành công cho `tests/integration/smoke.mjs`, `tests/integration/performance.mjs`, `tests/e2e/order-recovery.spec.mjs` và `tests/e2e/checkout.spec.mjs`.
- `bash -n` thành công cho các script trong `deploy/`.
- Đã kiểm tra cú pháp TypeScript/TSX của các file auth, DTO, frontend và test đã sửa; lần rà không phát hiện lỗi parse TypeScript. Đây không phải kết quả type-check đầy đủ.
- Đã rà lại import chữ hoa `DTO/`, endpoint fixed `PATCH /auth/profile`, tên claim `user_id`/`auth_version`, transaction đổi mật khẩu, CORS/catalog smoke và các tên service/biến môi trường trong runbook.
- Không thêm migration; không thay `schema.prisma`, các migration fixed, module payment/refund, session/cart hoặc CI/CD workflow.

## Chưa thể xác nhận

- `npm run setup` không hoàn tất vì môi trường không phân giải được `registry.npmjs.org` (`getaddrinfo EAI_AGAIN`). Do dependency chưa cài, **chưa chạy hoặc chưa xác nhận pass** `npm run check`, `npm run test:integration`, `npm run test:e2e`, `npm run test:smoke` và build đầy đủ.
- Integration/E2E cần PostgreSQL test riêng có tên kết thúc `_test`; browser test cần Chromium và các service được mô tả trong `tests/README.md`.
- Docker daemon không có trong môi trường đóng gói; chưa xác minh Compose runtime/image trên máy thật.
- Chưa có thông tin xác thực merchant VNPay hoặc quyền truy cập AWS/VPS; QR/ATM/thẻ/refund trên Sandbox, DNS/TLS, CI/CD, public smoke, reboot và rollback thật **chưa được kiểm thử**.

## Lệnh nghiệm thu đề xuất

Chạy từ thư mục gốc `BrewLite` sau khi cài Node.js 24, npm và Docker theo tài liệu: `npm run setup`, `npm run check`, sau đó chuẩn bị DB test riêng theo `tests/README.md`, chạy `npm run test:integration`, `npm run test:e2e`, `npm run test:smoke`. Cuối cùng mới thử payment Sandbox và deploy lên staging/VPS theo `docs/runbook.md` và `docs/deployment.md`. Không dùng database production cho test.

Không coi các số liệu lịch sử trong `TEST-RESULTS.md` hoặc kết quả của bản ZIP fixed ban đầu là kết quả kiểm thử của cây mã đã ghép.
