# BrewLite · Assignment 2

BrewLite là ứng dụng đặt cà phê. Next.js hiển thị menu và giỏ hàng. NestJS xử lý xác thực, đơn hàng, thanh toán và quản trị. Prisma kết nối PostgreSQL. CI/CD chạy trên GitHub Actions, triển khai lên VPS Ubuntu bằng Docker Compose và Caddy.

| Đường dẫn | Nội dung |
| --- | --- |
| `app/web` | Next.js, giao diện, ảnh và giỏ hàng |
| `app/api` | NestJS, Prisma, migrations, seed và test API |
| `docs` | Yêu cầu, sơ đồ, kiến trúc, truy vết và hướng dẫn triển khai |
| `deploy` | `Caddyfile`, `release.sh`, `backup.sh`, `env.example`, hướng dẫn VPS |
| `scripts/smoke.mjs` | Smoke test sau deploy (`npm run test:smoke`) |
| `.github/workflows/ci.yml` | Ba job `verify`, `images`, `deploy` |
| `docker-compose.yml` | PostgreSQL cho local (`127.0.0.1:5433`) |
| `docker-compose.prod.yml` | Stack production: `db`, `api`, `web`, `caddy` |

## Chạy local trên Windows

Cần Node.js 24, npm và Docker Desktop. Với DB mới, sao chép cấu hình mẫu rồi điền mật khẩu DB cùng `JWT_SECRET`.

```powershell
if (!(Test-Path .env)) { Copy-Item .env.example .env }
if (!(Test-Path app/api/.env)) { Copy-Item app/api/.env.example app/api/.env }
if (!(Test-Path app/web/.env.local)) { Copy-Item app/web/.env.example app/web/.env.local }

npm run db:up                                   # docker compose up -d db
npm --prefix app/api run db:migrate
npm --prefix app/api run db:seed
```

Mở hai terminal ở thư mục gốc.

```powershell
npm run dev:backend
```

```powershell
npm run dev:frontend
```

| Thành phần | Địa chỉ mặc định |
| --- | --- |
| Website | <http://localhost:3000> |
| NestJS API | <http://localhost:3001> |
| Health check | <http://localhost:3001/health> |
| Swagger | <http://localhost:3001/swagger> |
| PostgreSQL từ máy dev | `127.0.0.1:5433` |

Để demo Ví/Thẻ mô phỏng, đặt `PAYMENT_PROVIDER=mock` trong `app/api/.env`. Đặt thêm `PAYMENT_MOCK_ALLOW_OVERRIDE=true` nếu cần demo cả nhánh lỗi và thử lại. Hướng dẫn cấu hình merchant, IPN và thẻ test nằm ở [VNPay Sandbox](docs/VNPAY.md).

`docker-compose.yml` chỉ chứa service `db` và ghim `name: brewlite` để luôn dùng
volume `brewlite_brewlite_pgdata`. Khi dựng thử stack production ở máy, luôn dùng
project khác (ví dụ `-p brewlite-trial`), nếu không Compose sẽ nhận nhầm container
và volume của môi trường dev.

Seed local cung cấp tài khoản `admin@brewlite.local` và `demo@brewlite.local` với mật khẩu mẫu `BrewLite@2026!`. Đơn demo ở trạng thái `COMPLETED` mới được tính vào Best Sellers. Tài khoản này chỉ dùng cho local; production phải tạo admin với mật khẩu riêng.

## Kiểm thử

```powershell
npm run check                       # lint + build + unit test cả hai app
npm run test:smoke -- <web> <api>   # kiểm tra một môi trường đang chạy
```

E2E của API cần PostgreSQL thử nghiệm riêng (`TEST_DATABASE_URL`):

```powershell
cd app/api
$env:TEST_DATABASE_URL = "postgresql://brewlite:<password>@127.0.0.1:5433/brewlite_test?schema=public"
npm run test:e2e
```

## CI/CD

Một pipeline, ba job trong [`.github/workflows/ci.yml`](.github/workflows/ci.yml):

1. **verify** — chạy cho mọi PR và push `main`: lint, build, unit test API; migrate và seed trên Postgres 16; e2e API; lint và build web; kiểm tra cú pháp script deploy và `docker compose config`.
2. **images** — chỉ push `main` và khi `vars.PUBLISH_IMAGES=true`: build 2 image, tag bất biến bằng commit SHA, đẩy lên GHCR.
3. **deploy** — khi `vars.DEPLOY_ENABLED=true`: SSH vào VPS, chạy `deploy/release.sh <sha>` (pull → backup → migrate → `up -d` → health → rollback), rồi smoke test qua `PRODUCTION_URL`.

Luồng đầy đủ và sơ đồ: [Kiến trúc](docs/architecture/overview.md) · [Sơ đồ triển khai](docs/diagrams/Deployment_Diagram.svg).

## Triển khai

- Hướng dẫn VPS, biến/secret GitHub, release và rollback: [deploy/README.md](deploy/README.md)
- URL HTTPS, smoke test, phương án dự phòng Render: [Triển khai](docs/deployment.md)
- Vận hành hằng ngày (log, restart, backup/restore, sự cố, gia hạn VPS/domain): [Runbook](docs/runbook.md)
- Lịch sử phát hành và minh chứng kiểm thử: [Release notes](docs/release-notes.md)
- Quyết định kiến trúc: [ADR-001](docs/architecture/adr/001-monorepo.md) · [ADR-002](docs/architecture/adr/002-payment-lifecycle.md) · [ADR-003](docs/architecture/adr/003-ubuntu-docker-https.md) · [ADR-004](docs/architecture/adr/004-secrets-and-access.md)
- Vị trí tài liệu và cách liên kết yêu cầu với test: [Ma trận truy vết](docs/traceability-matrix.md)

Đặt check **Verify BrewLite** làm điều kiện merge vào `main` trên GitHub và gắn link lần chạy CI cùng minh chứng nghiệm thu vào PR.
