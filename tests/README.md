# Kiểm thử BrewLite

Unit test và test HTTP tích hợp nằm cùng NestJS để dùng cấu hình Jest, Prisma và Supertest của API. Playwright chạy hành trình từ menu đến xác nhận trên giao diện mobile.

| Lệnh từ thư mục gốc | Phạm vi |
| --- | --- |
| `npm run check` | Lint, unit test và build |
| `npm run test:integration` | Các suite trong `apps/api/test`, gồm API đơn hàng, thanh toán, IPN mô phỏng và health |
| `npm run test:e2e` | Đăng ký, đăng nhập, chọn món, thanh toán mock thất bại, thử lại cùng đơn và xác nhận |
| `npm run test:smoke` | Kiểm tra web, API, DB, CORS và catalog trên môi trường đang chạy |

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
