# BrewLite · Assignment 2

BrewLite là ứng dụng đặt cà phê. Next.js hiển thị menu và giỏ hàng. NestJS xử lý xác thực, đơn hàng, thanh toán và quản trị. Prisma kết nối PostgreSQL.

| Đường dẫn | Nội dung |
| --- | --- |
| `apps/web` | Next.js, giao diện, ảnh và giỏ hàng |
| `apps/api` | NestJS, Prisma, migrations, seed và test API |
| `tests` | Cấu hình Playwright và test trình duyệt |
| `docs` | Yêu cầu, sơ đồ, kiến trúc, truy vết và hướng dẫn triển khai |
| `.github/workflows/ci.yml` | Kiểm tra khi mở PR hoặc push lên `main` |
| `docker-compose.yml` | Cấu hình chạy PostgreSQL, API và web ở local |

## Nâng cấp từ cấu trúc cũ

Nếu đã chạy BrewLite, chép file cấu hình local từ checkout cũ sang đúng đường dẫn mới. Giữ thông tin kết nối PostgreSQL đang dùng.

| File cũ | File mới |
| --- | --- |
| `frontend/.env.local` | `apps/web/.env.local` |
| `backend/.env` | `apps/api/.env` |
| `.env` gốc cho Compose | `.env` gốc |

Khi chạy Compose từ thư mục khác, dùng `docker compose ls` để lấy tên project cũ và đặt `COMPOSE_PROJECT_NAME` theo tên đó nếu muốn dùng lại volume. Migration đi qua `prisma migrate deploy`. Chạy seed trên DB mới để tạo catalog và tài khoản mẫu. Seed cũng cập nhật dữ liệu catalog mẫu nên cần cân nhắc trước khi chạy trên catalog đã chỉnh sửa.

## Chạy local trên Windows

Cần Node.js 24, npm và Docker Desktop. Với DB mới, sao chép cấu hình mẫu từ thư mục gốc và điền mật khẩu DB cùng `JWT_SECRET`. `DATABASE_URL` và `DIRECT_URL` trong `apps/api/.env` cần trỏ đúng DB.

```powershell
if (!(Test-Path .env)) { Copy-Item .env.example .env }
if (!(Test-Path apps/api/.env)) { Copy-Item apps/api/.env.example apps/api/.env }
if (!(Test-Path apps/web/.env.local)) { Copy-Item apps/web/.env.example apps/web/.env.local }

docker compose up -d db
npm run setup
npm run db:migrate
npm run db:seed
```

Mở hai terminal ở thư mục gốc.

```powershell
npm run dev:api
```

```powershell
npm run dev:web
```

| Thành phần | Địa chỉ mặc định |
| --- | --- |
| Website | <http://localhost:3000> |
| NestJS API | <http://localhost:3001> |
| Health check | <http://localhost:3001/health> |
| Swagger | <http://localhost:3001/swagger> |
| PostgreSQL từ máy dev | `127.0.0.1:5433` |

Để demo Ví/Thẻ mô phỏng, đặt `PAYMENT_PROVIDER=mock` trong `apps/api/.env`. Đặt thêm `PAYMENT_MOCK_ALLOW_OVERRIDE=true` nếu cần demo cả nhánh lỗi và thử lại. Hướng dẫn cấu hình merchant, IPN và thẻ test nằm ở [VNPay Sandbox](docs/VNPAY.md).

### Chạy cả ba dịch vụ bằng Compose

Điền biến cho các container trong `.env` gốc. Để demo mock trong image production, đặt `PAYMENT_PROVIDER=mock` và `PAYMENT_ALLOW_MOCK_IN_PRODUCTION=true` ở file đó.

```powershell
docker compose --profile app up -d --build
docker compose --profile app ps
```

Trên DB mới, chạy thêm `docker compose --profile app exec backend npm run db:seed`. API chạy migration khi khởi động. Web gọi URL trong `NEXT_PUBLIC_API_URL`, còn API kết nối DB qua `db:5432` trong mạng Docker. Build lại web sau khi đổi URL API.

Seed local cung cấp tài khoản `admin@brewlite.local` và `demo@brewlite.local` với mật khẩu mẫu `BrewLite@2026!`. Đơn demo ở trạng thái `COMPLETED` mới được tính vào Best Sellers.

## Kiểm thử và bàn giao

- `npm run check` chạy lint, unit test và build cả hai app.
- `npm run test:integration` và `npm run test:e2e` dùng PostgreSQL thử nghiệm riêng. [Cách chuẩn bị DB test](tests/README.md)
- Đặt check **Verify BrewLite** làm điều kiện merge vào `main` trên GitHub. Gắn link lần chạy CI và minh chứng nghiệm thu vào PR hoặc release.
- Xem cách lấy URL HTTPS, cấu hình build, smoke test và quay về bản deploy trước. [Triển khai](docs/deployment.md)
- Xem vị trí đặt tài liệu và cách liên kết yêu cầu với test. [Ma trận truy vết](docs/traceability-matrix.md)
