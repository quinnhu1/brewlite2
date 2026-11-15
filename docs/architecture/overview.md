# Kiến trúc BrewLite

Tài liệu này mô tả hệ thống đang có trong repo: các thành phần, ranh giới trách
nhiệm, luồng request ở production và luồng CI/CD. Quyết định triển khai chi tiết
nằm ở [ADR-003](adr/003-ubuntu-docker-https.md); quản lý secret ở
[ADR-004](adr/004-secrets-and-access.md).

## 1. Thành phần

| Thành phần | Thư mục | Vai trò | Cổng |
| --- | --- | --- | --- |
| Web | `app/web` | Next.js App Router: menu, giỏ hàng, checkout, trang quản trị | 3000 |
| API | `app/api` | NestJS: xác thực, catalog, đơn hàng, thanh toán, khuyến mãi, điểm thưởng | 3001 |
| DB | `docker-compose.yml` (local), `docker-compose.prod.yml` (prod) | PostgreSQL 16, dữ liệu qua Prisma | 5432 (prod nội bộ), 5433 (local) |
| Proxy | `deploy/Caddyfile` | TLS, HTTP→HTTPS, định tuyến `/api/*` và phần còn lại | 80/443 |
| Registry | GHCR | Image `ghcr.io/<owner>/<repo>-api` và `-web`, tag = commit SHA | — |

## 2. Phân lớp trong API

```
HTTP request
   ↓
Controller        kiểm tra DTO, phân quyền (JwtAuthGuard, RolesGuard)
   ↓
Service           nghiệp vụ, transaction, idempotency
   ↓
PrismaService     truy vấn, migration, seed
   ↓
PostgreSQL
```

- **Controller** không chứa nghiệp vụ; chỉ ánh xạ HTTP sang service và trả mã lỗi.
- **Service** giữ các bất biến: giá tính ở server, tồn kho trừ trong transaction,
  mỗi đơn tối đa một payment thành công, idempotency-key chống tạo trùng.
- **Prisma** là nguồn schema duy nhất (`app/api/prisma/schema.prisma`); migration
  được áp dụng bằng `prisma migrate deploy`, không dùng `db push` cho production.
- **Xác thực**: JWT ký bằng `JWT_SECRET`, verify bằng `@nestjs/jwt`; role đọc lại
  từ DB mỗi request để thu hồi quyền có hiệu lực ngay.

Web gọi API qua `API_BASE_URL` (`app/web/src/lib/api/client.ts`), mặc định
`http://localhost:3001` ở local và `/api` ở production.

## 3. Luồng request ở production

Một domain duy nhất, Caddy là điểm vào duy nhất:

```
Trình duyệt ──https──> Caddy :443
                         ├── /api/*  → api:3001   (bỏ prefix /api)
                         └── /*      → web:3000
                                          api ──> db:5432 (mạng nội bộ compose)
```

- Chỉ service `caddy` publish cổng ra host; `api` và `web` chỉ `expose` trong
  mạng compose, `db` không publish gì.
- Web được build với `NEXT_PUBLIC_API_URL=/api`, nên đổi domain không phải build
  lại image.
- TLS do Caddy tự cấp/gia hạn, lưu ở volume `caddy_data`; HTTP chuyển hướng 308
  sang HTTPS.
- Health check: `GET /health` của API (không phụ thuộc DB) dùng cho container
  healthcheck, Caddy và `deploy/release.sh`.

Sơ đồ: [deployment.mmd](../diagrams/deployment.mmd) ·
[Deployment_Diagram.svg](../diagrams/Deployment_Diagram.svg).

## 4. Luồng CI/CD

```
PR / push                push main                     sau khi images xong
   │                        │                                  │
   ▼                        ▼                                  ▼
verify ───────────────> images ──────────────────────────> deploy
lint, build, unit,       build & push 2 image            SSH: tar cấu hình
migrate, seed, e2e,      tag <sha> + main                → release.sh <sha>
validate cấu hình        lên GHCR                        → smoke test
```

`verify` (mọi PR và push `main`):

1. `npm ci`, lint, build, unit test của `app/api`.
2. `prisma migrate deploy` + `prisma db seed` trên Postgres 16 service.
3. e2e test API (`TEST_DATABASE_URL`).
4. `npm ci`, lint, build của `app/web`.
5. `bash -n` hai script deploy, `node --check scripts/smoke.mjs`,
   `docker compose config` với `deploy/env.example`.

`images` (chỉ push `main`, bật bằng `vars.PUBLISH_IMAGES=true`): build 2 image,
tag bất biến là `${{ github.sha }}`, nhãn `org.opencontainers.image.revision`.

`deploy` (bật bằng `vars.DEPLOY_ENABLED=true`, environment `production`):

1. Ghi SSH key tạm, kiểm tra `known_hosts`.
2. `scp` `deploy/` + `docker-compose.prod.yml` sang `/opt/brewlite`.
3. `bash deploy/release.sh <sha>`: lock → pull → backup → migrate → `up -d` →
   health qua domain công khai → `.last-good-tag` hoặc rollback.
4. `npm run test:smoke` kiểm tra health, catalog và hai trang web.

Chi tiết vận hành: [deploy/README.md](../../deploy/README.md) ·
[runbook](../runbook.md).

## 5. Môi trường

| Môi trường | Cách chạy | DB | API base |
| --- | --- | --- | --- |
| Local dev | `npm run db:up`, `npm run dev:backend`, `npm run dev:frontend` | `brewlite-postgres` ở `127.0.0.1:5433` | `http://localhost:3001` |
| Thử nhanh toàn stack | `docker compose -p brewlite-trial -f docker-compose.prod.yml up -d` | volume riêng của project trial | qua Caddy |
| Production | VPS + `docker compose -f docker-compose.prod.yml` | volume `pgdata` | `https://<domain>/api` |

Luôn dùng `-p` khác `brewlite` khi dựng thử `docker-compose.prod.yml`, nếu không
compose sẽ nhận nhầm container/volume của môi trường dev.

## 6. Ngoài phạm vi repo

DNS, firewall, cài Docker, `/opt/brewlite/.env`, bật biến/secret GitHub và kiểm
thử trên VPS thật do người phụ trách hạ tầng thực hiện; checklist ở
[deploy/README.md](../../deploy/README.md).
