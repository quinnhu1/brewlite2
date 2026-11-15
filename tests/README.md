# Kiểm thử BrewLite

Unit test và test HTTP tích hợp nằm cùng NestJS để dùng cấu hình Jest, Prisma và Supertest của API. Playwright chạy hành trình từ menu đến xác nhận trên giao diện mobile.

| Lệnh từ thư mục gốc | Phạm vi |
| --- | --- |
| `npm run check` | Lint, unit Jest (gồm auth DTO/service và giới hạn bcrypt 72 byte), client tests và build |
| `npm run test:client` | 8 ca giỏ theo user, thu hồi dữ liệu phiên và response cũ; Node 24, không cần browser/DB |
| `npm run test:integration` | Các suite trong `apps/api/test`, gồm auth theo hợp đồng fixed, đổi mật khẩu/thu hồi phiên, API đơn hàng, thanh toán, IPN mô phỏng và health |
| `npm run test:e2e` | 6 hành trình browser: checkout, recovery/refund, quyền đơn, đổi tài khoản và đổi mật khẩu |
| `npm run test:smoke` | Kiểm tra home và `/menu` trả HTML, API/PostgreSQL health, CORS và catalog trên môi trường đang chạy |

## Chuẩn bị PostgreSQL test

Các test tích hợp dọn dữ liệu trong DB test. Tạo database riêng có tên kết thúc bằng `_test`. Ví dụ dưới đây dùng container DB đã chạy và cấu hình mẫu local.

```powershell
docker compose exec db createdb -U brewlite brewlite_test

$env:TEST_DATABASE_URL = 'postgresql://brewlite:CONGNGHEPHANMEM12345@127.0.0.1:5433/brewlite_test?schema=public'
$env:DATABASE_URL = $env:TEST_DATABASE_URL
$env:DIRECT_URL = $env:TEST_DATABASE_URL
npm run db:migrate
npm run db:seed
npm run test:integration

npm exec -- playwright install chromium
npm run test:e2e

Remove-Item Env:DATABASE_URL,Env:DIRECT_URL,Env:TEST_DATABASE_URL
```

Chỉnh URL theo user, mật khẩu và cổng của DB test. Playwright tự khởi động API test ở cổng 3101 và web test ở cổng 3100. Chạy từng suite lần lượt khi chúng dùng chung DB. Workflow trên GitHub tạo PostgreSQL mới cho mỗi lần chạy.

## Các ca mới

`order-recovery.spec.mjs` kiểm tra tracking retry bằng phương thức khác, refresh, hủy/hoàn một lần, hủy failed chưa thu, ngăn đọc đơn người khác, đổi tài khoản không mang theo đơn thay thế và đổi mật khẩu phải đăng nhập lại. Tổng cộng 6 browser scenarios cùng checkout.spec.mjs. ZIP fixed gốc ghi nhận 64 integration tests trước lần ghép; con số hiện tại cần được xác nhận lại bằng lần chạy `npm run test:integration`. Chạy browser sau integration trên DB test riêng và tuần tự; giữ giới hạn xác thực để test hành vi thật, không thêm bypass chỉ để CI xanh.

Client tests dùng Node built-in test runner với store Zustand và API client thực; chỉ thay storage/fetch ở ranh giới môi trường. Chúng không thay thế thao tác UI bằng Chromium. Trên máy có browser hệ thống có thể đặt PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH; nếu launch bị OS chặn thì ghi blocked và chuyển sang máy/CI hoạt động, không ghi PASS.

`tests/postman/BrewLite.postman_collection.json` hỗ trợ thử tay. Chọn nhánh MOCK hoặc VNPAY tương ứng cấu hình, không chạy cả hai nhánh cùng một order đã paid.

## Hiệu năng và phạm vi đo

Mặc định chỉ đọc health, products và product detail: đặt API_BASE_URL rồi chạy `node tests/integration/performance.mjs`. Có PERF_BEARER_TOKEN thì thêm auth/me và orders/me; token chỉ đặt ở env cục bộ, không commit. Mỗi nhóm read có 100 mẫu, 5 đồng thời sau warm-up. Ghi p50/p95/max và exit 1 nếu có mẫu >=500 ms.

Để tái lập đủ 12 nhóm/690 mẫu, dùng DB *_test mới, migrate/seed, khởi động API **mock** với chính DB đó ở loopback; tắt worker test như suite integration. Chỉ trong môi trường test dùng một lần này:

```powershell
$env:API_BASE_URL='http://127.0.0.1:3001'
$env:DATABASE_URL=$env:TEST_DATABASE_URL
$env:PERF_ALLOW_WRITES='true'
node tests/integration/performance.mjs
Remove-Item Env:PERF_ALLOW_WRITES
```

Phép đo tạo 5 user, login 5 lần, quote 100 lần và 20 chu kỳ order/payment/detail/cancel-refund tuần tự, rồi đọc auth/history. Seed sạch trước khi chạy riêng bài đo để rate limit từ suite trước không ảnh hưởng. Cổng loopback và biến DATABASE_URL không tự chứng minh API đang dùng DB đó: người chạy phải xác nhận cấu hình của process API. Không trỏ API tới dữ liệu nhóm/production.

Đây là mẫu tải nhỏ trong môi trường local với payment mock, không bao phủ mọi API hoặc độ trễ VNPay. Đo read-only trên public và ghi điều kiện mạng/tải; chỉ đo ghi trên staging dùng một lần. Không dùng p95 menu để kết luận toàn bộ API luôn dưới 500 ms.


## Auth validation được bổ sung

Unit suite `apps/api/src/auth/auth.dto.spec.ts`, `auth.service.spec.ts` và `password.spec.ts` kiểm tra validation DTO, login legacy không bị ràng buộc bởi rule mật khẩu mới, đổi mật khẩu giữ `auth_version`/transaction, unique constraint và biên 72 byte UTF-8 (bao gồm chữ tiếng Việt nhiều byte). API integration `apps/api/test/auth.e2e-spec.ts` kiểm tra hợp đồng đăng ký trả profile, đăng nhập riêng, endpoint `PATCH /auth/profile`, thu hồi token cũ và mật khẩu đúng 72 byte. Chạy các suite trên database riêng có tên kết thúc bằng `_test`; không dùng database production.
